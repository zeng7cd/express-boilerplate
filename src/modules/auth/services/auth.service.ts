/**
 * 认证服务
 */
import bcrypt from 'bcryptjs';
import { db, users, roles, userRoles, rolePermissions, permissions, sessions } from '@/core/database';
import { eq, or, and, gt } from 'drizzle-orm';
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
    const existingUser = await db.query.users.findFirst({
      where: or(eq(users.email, data.email), eq(users.username, data.username)),
    });

    if (existingUser) {
      throw new DuplicateException('User with this email or username already exists');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

    // 创建用户
    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        username: data.username,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
      })
      .returning({ id: users.id, email: users.email, username: users.username });

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

    return user;
  }

  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    // 查找用户及其角色权限
    const user = await db.query.users.findFirst({
      where: eq(users.email, data.email),
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
    const userRolesList = user.userRoles.map((ur) => ur.role.name);
    const userPermissions = user.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => rp.permission.name)
    );

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

    // 更新最后登录时间
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

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
      ur.role.rolePermissions.map((rp) => rp.permission.name)
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
    // 将 token 加入黑名单
    await tokenBlacklistService.addToBlacklist(token);

    // 删除会话记录
    await db.delete(sessions).where(eq(sessions.token, token));
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
