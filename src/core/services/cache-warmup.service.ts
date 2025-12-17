/**
 * 缓存预热服务
 * 在应用启动时预热常用数据
 */
import type { CacheService } from '@/core/cache';
import { db } from '@/core/database';
import { getAppPinoLogger } from '@/core/logger/pino';

export class CacheWarmupService {
  private readonly logger = getAppPinoLogger();

  constructor(private readonly cacheService: CacheService) {}
  /**
   * 预热所有缓存（异步后台执行，不阻塞启动）
   */
  async warmupAll(): Promise<void> {
    this.logger.info('Starting cache warmup in background...');

    // 不等待完成，后台执行
    this.warmupInBackground().catch((err) => this.logger.error({ err }, 'Background warmup failed'));
  }

  /**
   * 后台预热
   */
  private async warmupInBackground(): Promise<void> {
    try {
      const results = await Promise.allSettled([this.warmupRoles(), this.warmupPermissions()]);

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        this.logger.warn({ failedCount: failed.length }, 'Some cache warmup tasks failed');
      } else {
        this.logger.info('Cache warmup completed successfully');
      }
    } catch (error) {
      this.logger.error({ err: error }, 'Cache warmup failed');
    }
  }

  /**
   * 预热角色数据
   */
  private async warmupRoles(): Promise<void> {
    try {
      const allRoles = await db.query.roles.findMany();
      await this.cacheService.set('roles:all', allRoles, 3600); // 1 小时
      this.logger.info({ count: allRoles.length }, 'Roles cache warmed up');
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to warmup roles cache');
    }
  }

  /**
   * 预热权限数据
   */
  private async warmupPermissions(): Promise<void> {
    try {
      const allPermissions = await db.query.permissions.findMany();
      await this.cacheService.set('permissions:all', allPermissions, 3600); // 1 小时
      this.logger.info({ count: allPermissions.length }, 'Permissions cache warmed up');
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to warmup permissions cache');
    }
  }

  /**
   * 清除所有预热的缓存
   */
  async clearWarmupCache(): Promise<void> {
    try {
      await Promise.all([this.cacheService.del('roles:all'), this.cacheService.del('permissions:all')]);
      this.logger.info('Warmup cache cleared');
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to clear warmup cache');
    }
  }
}

// 延迟初始化单例，避免循环依赖
let cacheWarmupServiceInstance: CacheWarmupService | null = null;

export const getCacheWarmupService = (): CacheWarmupService => {
  if (!cacheWarmupServiceInstance) {
    const { cacheService } = require('@/core/cache');
    cacheWarmupServiceInstance = new CacheWarmupService(cacheService);
  }
  return cacheWarmupServiceInstance;
};

// 向后兼容的导出
export const cacheWarmupService = new Proxy({} as CacheWarmupService, {
  get(_target, prop) {
    return getCacheWarmupService()[prop as keyof CacheWarmupService];
  },
});
