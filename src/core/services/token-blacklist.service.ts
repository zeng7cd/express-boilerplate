/**
 * Token 黑名单服务
 * 用于撤销已发放的 JWT Token
 */
import type { CacheService } from '@/core/cache';
import { getAppPinoLogger } from '@/core/logger/pino';
import type { JWTService } from '@/modules/auth/services/jwt.service';

export class TokenBlacklistService {
  private readonly logger = getAppPinoLogger();
  private readonly prefix = 'blacklist:';

  constructor(
    private readonly cacheService: CacheService,
    private readonly jwtService: JWTService,
  ) {}

  /**
   * 将 token 加入黑名单
   */
  async addToBlacklist(token: string, expiresIn?: number): Promise<void> {
    try {
      const decoded = this.jwtService.decodeToken(token);
      if (!decoded?.jti) {
        this.logger.warn('Token does not have jti claim');
        throw new Error('Token does not have jti claim');
      }

      // 计算 TTL（使用 token 的剩余有效期）
      const ttl = expiresIn || this.calculateTTL(decoded.exp);

      if (ttl > 0) {
        await this.cacheService.set(`${this.prefix}${decoded.jti}`, true, ttl);
        this.logger.info({ jti: decoded.jti }, 'Token added to blacklist');
      }
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to add token to blacklist');
      throw error;
    }
  }

  /**
   * 检查 token 是否在黑名单中
   */
  async isBlacklisted(token: string): Promise<boolean> {
    try {
      const decoded = this.jwtService.decodeToken(token);
      if (!decoded?.jti) {
        return false;
      }

      const result = await this.cacheService.get<boolean>(`${this.prefix}${decoded.jti}`);
      return result === true;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to check token blacklist');
      return false;
    }
  }

  /**
   * 批量将用户的所有 token 加入黑名单
   */
  async blacklistUserTokens(userId: string, expiresIn: number): Promise<void> {
    try {
      // 使用用户 ID 作为标记，撤销该用户的所有 token
      await this.cacheService.set(`${this.prefix}user:${userId}`, true, expiresIn);
      this.logger.info({ userId }, 'All user tokens blacklisted');
    } catch (error) {
      this.logger.error({ err: error, userId }, 'Failed to blacklist user tokens');
      throw error;
    }
  }

  /**
   * 检查用户的所有 token 是否被撤销
   */
  async isUserBlacklisted(userId: string): Promise<boolean> {
    try {
      const result = await this.cacheService.get<boolean>(`${this.prefix}user:${userId}`);
      return result === true;
    } catch (error) {
      this.logger.error({ err: error, userId }, 'Failed to check user blacklist');
      return false;
    }
  }

  /**
   * 计算 token 的剩余有效期（秒）
   */
  private calculateTTL(exp?: number): number {
    if (!exp) return 0;
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, exp - now);
  }
}

// 延迟初始化单例，避免循环依赖
let tokenBlacklistServiceInstance: TokenBlacklistService | null = null;

export const getTokenBlacklistService = (): TokenBlacklistService => {
  if (!tokenBlacklistServiceInstance) {
    const { cacheService } = require('@/core/cache');
    const { jwtService } = require('@/modules/auth/services/jwt.service');
    tokenBlacklistServiceInstance = new TokenBlacklistService(cacheService, jwtService);
  }
  return tokenBlacklistServiceInstance;
};

// 向后兼容的导出
export const tokenBlacklistService = new Proxy({} as TokenBlacklistService, {
  get(_target, prop) {
    return getTokenBlacklistService()[prop as keyof TokenBlacklistService];
  },
});
