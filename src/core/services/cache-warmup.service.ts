/**
 * 缓存预热服务
 * 在应用启动时预热常用数据
 */
import { cacheService } from '@/core/cache';
import { db } from '@/core/database';
import { getAppPinoLogger } from '@/core/logger/pino';

const logger = getAppPinoLogger();

export class CacheWarmupService {
  /**
   * 预热所有缓存（异步后台执行，不阻塞启动）
   */
  async warmupAll(): Promise<void> {
    logger.info('Starting cache warmup in background...');

    // 不等待完成，后台执行
    this.warmupInBackground().catch((err) => logger.error({ err }, 'Background warmup failed'));
  }

  /**
   * 后台预热
   */
  private async warmupInBackground(): Promise<void> {
    try {
      const results = await Promise.allSettled([this.warmupRoles(), this.warmupPermissions()]);

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        logger.warn({ failedCount: failed.length }, 'Some cache warmup tasks failed');
      } else {
        logger.info('Cache warmup completed successfully');
      }
    } catch (error) {
      logger.error({ err: error }, 'Cache warmup failed');
    }
  }

  /**
   * 预热角色数据
   */
  private async warmupRoles(): Promise<void> {
    try {
      const allRoles = await db.query.roles.findMany();
      await cacheService.set('roles:all', allRoles, 3600); // 1 小时
      logger.info({ count: allRoles.length }, 'Roles cache warmed up');
    } catch (error) {
      logger.error({ err: error }, 'Failed to warmup roles cache');
    }
  }

  /**
   * 预热权限数据
   */
  private async warmupPermissions(): Promise<void> {
    try {
      const allPermissions = await db.query.permissions.findMany();
      await cacheService.set('permissions:all', allPermissions, 3600); // 1 小时
      logger.info({ count: allPermissions.length }, 'Permissions cache warmed up');
    } catch (error) {
      logger.error({ err: error }, 'Failed to warmup permissions cache');
    }
  }

  /**
   * 清除所有预热的缓存
   */
  async clearWarmupCache(): Promise<void> {
    try {
      await Promise.all([cacheService.del('roles:all'), cacheService.del('permissions:all')]);
      logger.info('Warmup cache cleared');
    } catch (error) {
      logger.error({ err: error }, 'Failed to clear warmup cache');
    }
  }
}

export const cacheWarmupService = new CacheWarmupService();
