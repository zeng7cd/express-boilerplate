/**
 * 认证服务
 */
import bcrypt from 'bcryptjs';
import { prisma } from '@/core/database';
import { jwtService } from './jwt.service';
import { env } from '@/core/config/env';
import { tokenBlacklistService } from '@/core/services/token-blacklist.service';
import { DuplicateException, InvalidCredentialsException } from '@/shared/exceptions';
import type { LoginRequest, RegisterRequest, AuthResponse, AuthenticatedUser } from '@/shared/types/auth';

export class AuthService {
  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<{ id: string; email: string; username: string }> {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existingUser) {
      throw new DuplicateException('User with this email or username already exists');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    // 分配默认角色
    const defaultRole = await prisma.role.findUnique({
      where: { name: 'user' },
    });

    if (defaultRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: defaultRole.id,
        },
      });
    }

    return user;
  }

  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new InvalidCredentialsException('Invalid email or password');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException('Invalid email or password');
    }

    // 提取角色和权限
    const roles = user.userRoles.map((ur: { role: { name: string } }) => ur.role.name);
    const permissions = user.userRoles.flatMap(
      (ur: { role: { rolePermissions: { permission: { name: string } }[] } }) =>
        ur.role.rolePermissions.map((rp) => rp.permission.name),
    );

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      roles,
      permissions,
    };

    // 生成令牌
    const accessToken = jwtService.generateAccessToken(authenticatedUser);
    const refreshToken = jwtService.generateRefreshToken(user.id);

    // 保存会话
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + jwtService.getExpiresInSeconds() * 1000),
      },
    });

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        roles,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: jwtService.getExpiresInSeconds(),
      },
    };
  }

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    // 验证刷新令牌
    const _decoded = jwtService.verifyRefreshToken(refreshToken);

    // 查找会话
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session || !session.user.isActive) {
      throw new InvalidCredentialsException('Invalid refresh token');
    }

    // 提取角色和权限
    const roles = session.user.userRoles.map((ur: { role: { name: string } }) => ur.role.name);
    const permissions = session.user.userRoles.flatMap(
      (ur: { role: { rolePermissions: { permission: { name: string } }[] } }) =>
        ur.role.rolePermissions.map((rp) => rp.permission.name),
    );

    const authenticatedUser: AuthenticatedUser = {
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
      roles,
      permissions,
    };

    // 生成新的访问令牌
    const newAccessToken = jwtService.generateAccessToken(authenticatedUser);

    // 更新会话
    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: newAccessToken,
        expiresAt: new Date(Date.now() + jwtService.getExpiresInSeconds() * 1000),
      },
    });

    return {
      accessToken: newAccessToken,
      expiresIn: jwtService.getExpiresInSeconds(),
    };
  }

  /**
   * 用户登出
   */
  async logout(token: string): Promise<void> {
    // 将 token 加入黑名单
    await tokenBlacklistService.addToBlacklist(token);

    // 删除会话记录
    await prisma.session.deleteMany({
      where: { token },
    });
  }

  /**
   * 登出所有设备（撤销用户的所有 token）
   */
  async logoutAllDevices(userId: string): Promise<void> {
    // 将用户的所有 token 加入黑名单
    const maxExpiry = jwtService.getRefreshExpiresInSeconds();
    await tokenBlacklistService.blacklistUserTokens(userId, maxExpiry);

    // 删除所有会话记录
    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * 验证会话
   */
  async validateSession(tokenId: string): Promise<boolean> {
    const session = await prisma.session.findFirst({
      where: {
        token: tokenId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return !!session;
  }
}

// 导出单例实例
export const authService = new AuthService();
