/**
 * JWT服务
 */
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

import { env } from '@/core/config/env';
import type { JWTPayload, AuthenticatedUser } from '@/shared/types/auth';

interface DecodedRefreshToken {
  sub: string;
  jti: string;
  type: 'refresh';
}

export class JWTService {
  private readonly secret: string;
  private readonly refreshSecret: string;
  private readonly expiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor() {
    this.secret = env.JWT_SECRET;
    this.refreshSecret = env.JWT_REFRESH_SECRET || env.JWT_SECRET;
    this.expiresIn = env.JWT_EXPIRES_IN;
    this.refreshExpiresIn = env.JWT_REFRESH_EXPIRES_IN;
  }

  /**
   * 生成访问令牌
   */
  generateAccessToken(user: AuthenticatedUser): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles,
      permissions: user.permissions,
      jti: nanoid(),
    };

    return jwt.sign(payload, this.secret, {
      expiresIn: this.getExpiresInSeconds(),
    });
  }

  /**
   * 生成刷新令牌
   */
  generateRefreshToken(userId: string): string {
    const payload = {
      sub: userId,
      type: 'refresh',
      jti: nanoid(),
    };

    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.getRefreshExpiresInSeconds(),
    });
  }

  /**
   * 验证访问令牌
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as JWTPayload;
      return decoded;
    } catch (_error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * 验证刷新令牌
   */
  verifyRefreshToken(token: string): { sub: string; jti: string } {
    try {
      const decoded = jwt.verify(token, this.refreshSecret) as DecodedRefreshToken;
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return { sub: decoded.sub, jti: decoded.jti };
    } catch (_error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * 从令牌中提取载荷（不验证）
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }

  /**
   * 获取令牌过期时间（秒）
   */
  getExpiresInSeconds(): number {
    return this.parseTime(this.expiresIn);
  }

  /**
   * 获取刷新令牌过期时间（秒）
   */
  getRefreshExpiresInSeconds(): number {
    return this.parseTime(this.refreshExpiresIn);
  }

  private parseTime(timeStr: string): number {
    const unit = timeStr.slice(-1);
    const value = parseInt(timeStr.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 3600; // 默认1小时
    }
  }
}

// 导出单例实例
export const jwtService = new JWTService();
