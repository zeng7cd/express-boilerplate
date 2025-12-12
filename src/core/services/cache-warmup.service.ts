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
   * 预热所有缓存
   */
  async warmupAll(): Promise<void> {
    logger.info('Starting cache warmup...');

    try {
      await Promise.all([
        this.warmupRoles(),
        this.warmupPermissions(),
        // 可以添加更多预热任务
      ]);

      logger.info('Cache warmup completed successfully');
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
