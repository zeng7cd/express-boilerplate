/**
 * 认证服务
 */
import bcrypt from 'bcryptjs';
import { eq, and, gt } from 'drizzle-orm';

import { env } from '@/core/config/env';
import { db, roles, userRoles, sessions } from '@/core/database';
import { eventBus } from '@/core/events';
import { DuplicateException, InvalidCredentialsException } from '@/shared/exceptions';
import type { LoginRequest, RegisterRequest, AuthResponse, AuthenticatedUser } from '@/shared/types/auth';

import type { UserRepository } from '@/modules/users/repositories/user.repository';
import type { JWTService } from './jwt.service';
import type { TokenBlacklistService } from '@/core/services/token-blacklist.service';

export class AuthService {
  constructor(
    private readonly jwtService: JWTService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly userRepository: UserRepository,
  ) {}
  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<{ id: string; email: string; username: string }> {
    // 使用 Repository 检查用户是否已存在
    const existingUser = await this.userRepository.findByEmailOrUsername(data.email, data.username);

    if (existingUser) {
      throw new DuplicateException('User with this email or username already exists');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

    // 使用 Repository 创建用户
    const user = await this.userRepository.createUser({
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
    const user = await this.userRepository.findByEmailWithRolesAndPermissions(data.email);

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
    const accessToken = this.jwtService.generateAccessToken(authenticatedUser);
    const refreshToken = this.jwtService.generateRefreshToken(user.id);

    // 保存会话
    await db.insert(sessions).values({
      userId: user.id,
      token: accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + this.jwtService.getExpiresInSeconds() * 1000),
    });

    // 使用 Repository 更新最后登录时间
    await this.userRepository.updateLastLogin(user.id);

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
        expiresIn: this.jwtService.getExpiresInSeconds(),
      },
    };
  }

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    // 验证刷新令牌
    const _decoded = this.jwtService.verifyRefreshToken(refreshToken);

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
    const newAccessToken = this.jwtService.generateAccessToken(authenticatedUser);

    // 更新会话
    await db
      .update(sessions)
      .set({
        token: newAccessToken,
        expiresAt: new Date(Date.now() + this.jwtService.getExpiresInSeconds() * 1000),
      })
      .where(eq(sessions.id, session.id));

    return {
      accessToken: newAccessToken,
      expiresIn: this.jwtService.getExpiresInSeconds(),
    };
  }

  /**
   * 用户登出
   */
  async logout(token: string): Promise<void> {
    // 解码 token 获取用户 ID
    const decoded = this.jwtService.decodeToken(token);

    // 将 token 加入黑名单
    await this.tokenBlacklistService.addToBlacklist(token);

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
    const maxExpiry = this.jwtService.getRefreshExpiresInSeconds();
    await this.tokenBlacklistService.blacklistUserTokens(userId, maxExpiry);

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

// 延迟初始化单例，避免循环依赖
let authServiceInstance: AuthService | null = null;

export const getAuthService = (): AuthService => {
  if (!authServiceInstance) {
    const { jwtService } = require('./jwt.service');
    const { tokenBlacklistService } = require('@/core/services/token-blacklist.service');
    const { userRepository } = require('@/modules/users/repositories/user.repository');

    authServiceInstance = new AuthService(jwtService, tokenBlacklistService, userRepository);
  }
  return authServiceInstance;
};

// 向后兼容的导出
export const authService = new Proxy({} as AuthService, {
  get(_target, prop) {
    return getAuthService()[prop as keyof AuthService];
  },
});
