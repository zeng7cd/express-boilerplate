/**
 * 认证服务
 */
import bcrypt from 'bcryptjs';
import { eq, and, gt } from 'drizzle-orm';

import { env } from '@/core/config/env';
import { db, roles, userRoles, sessions } from '@/core/database';
import { eventBus } from '@/core/events';
import { tokenBlacklistService } from '@/core/services/token-blacklist.service';
import { DuplicateException, InvalidCredentialsException } from '@/shared/exceptions';
import type { LoginRequest, RegisterRequest, AuthResponse, AuthenticatedUser } from '@/shared/types/auth';

import { jwtService } from './jwt.service';

export class AuthService {
  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<{ id: string; email: string; username: string }> {
    // 使用 Repository 检查用户是否已存在
    const { userRepository } = await import('@/modules/users/repositories/user.repository');
    const existingUser = await userRepository.findByEmailOrUsername(data.email, data.username);

    if (existingUser) {
      throw new DuplicateException('User with this email or username already exists');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

    // 使用 Repository 创建用户
    const user = await userRepository.createUser({
      email: data.email,
      username: data.username,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    // 分配默认角色
    const defaultRole = await db.query.roles.findFirst({
      where: eq(roles.name, 'user'),
    });

    if (defaultRole) {
      await db.insert(userRoles).values({
        userId: user.id,
        roleId: defaultRole.id,
      });
    }

    // 发布用户注册事件
    eventBus.publish('user.registered', {
      userId: user.id,
      email: user.email,
      username: user.username,
      timestamp: new Date(),
    });

    return { id: user.id, email: user.email, username: user.username };
  }

  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    // 使用 Repository 查找用户及其角色权限
    const { userRepository } = await import('@/modules/users/repositories/user.repository');
    const user = await userRepository.findByEmailWithRolesAndPermissions(data.email);

    if (!user || !user.isActive) {
      throw new InvalidCredentialsException('Invalid email or password');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException('Invalid email or password');
    }

    // 提取角色和权限
    const userRolesList = user.userRoles.map((ur) => ur.role.name);
    const userPermissions = user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.name));

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      roles: userRolesList,
      permissions: userPermissions,
    };

    // 生成令牌
    const accessToken = jwtService.generateAccessToken(authenticatedUser);
    const refreshToken = jwtService.generateRefreshToken(user.id);

    // 保存会话
    await db.insert(sessions).values({
      userId: user.id,
      token: accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + jwtService.getExpiresInSeconds() * 1000),
    });

    // 使用 Repository 更新最后登录时间
    await userRepository.updateLastLogin(user.id);

    // 发布用户登录事件
    eventBus.publish('user.login', {
      userId: user.id,
      email: user.email,
      timestamp: new Date(),
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        roles: userRolesList,
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
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.refreshToken, refreshToken),
      with: {
        user: {
          with: {
            userRoles: {
              with: {
                role: {
                  with: {
                    rolePermissions: {
                      with: {
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
    const userRolesList = session.user.userRoles.map((ur) => ur.role.name);
    const userPermissions = session.user.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => rp.permission.name),
    );

    const authenticatedUser: AuthenticatedUser = {
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
      roles: userRolesList,
      permissions: userPermissions,
    };

    // 生成新的访问令牌
    const newAccessToken = jwtService.generateAccessToken(authenticatedUser);

    // 更新会话
    await db
      .update(sessions)
      .set({
        token: newAccessToken,
        expiresAt: new Date(Date.now() + jwtService.getExpiresInSeconds() * 1000),
      })
      .where(eq(sessions.id, session.id));

    return {
      accessToken: newAccessToken,
      expiresIn: jwtService.getExpiresInSeconds(),
    };
  }

  /**
   * 用户登出
   */
  async logout(token: string): Promise<void> {
    // 解码 token 获取用户 ID
    const decoded = jwtService.decodeToken(token);

    // 将 token 加入黑名单
    await tokenBlacklistService.addToBlacklist(token);

    // 删除会话记录
    await db.delete(sessions).where(eq(sessions.token, token));

    // 发布用户登出事件
    if (decoded?.sub) {
      eventBus.publish('user.logout', {
        userId: decoded.sub,
        timestamp: new Date(),
      });
    }
  }

  /**
   * 登出所有设备（撤销用户的所有 token）
   */
  async logoutAllDevices(userId: string): Promise<void> {
    // 将用户的所有 token 加入黑名单
    const maxExpiry = jwtService.getRefreshExpiresInSeconds();
    await tokenBlacklistService.blacklistUserTokens(userId, maxExpiry);

    // 删除所有会话记录
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  /**
   * 验证会话
   */
  async validateSession(tokenId: string): Promise<boolean> {
    const session = await db.query.sessions.findFirst({
      where: and(eq(sessions.token, tokenId), gt(sessions.expiresAt, new Date())),
    });

    return !!session;
  }
}

// 导出单例实例
export const authService = new AuthService();
