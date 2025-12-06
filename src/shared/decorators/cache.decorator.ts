import { cacheService } from '@/core/cache/redis';
import { getAppPinoLogger } from '@/core/logger/pino';

const logger = getAppPinoLogger();

/**
 * 缓存装饰器选项
 */
export interface CacheOptions {
  /** 缓存键前缀 */
  key: string;
  /** 缓存过期时间（秒），默认 300 秒 */
  ttl?: number;
  /** 是否缓存结果的条件函数 */
  condition?: (result: any) => boolean;
  /** 是否包含参数在缓存键中 */
  includeArgs?: boolean;
}

/**
 * 缓存装饰器
 * 自动缓存方法的返回结果
 *
 * @example
 * ```typescript
 * class UserService {
 *   @Cacheable({ key: 'user', ttl: 300 })
 *   async getUserById(id: string) {
 *     return await db.query.users.findFirst({ where: eq(users.id, id) });
 *   }
 * }
 * ```
 */
export function Cacheable(options: CacheOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 生成缓存键
      const cacheKey = options.includeArgs !== false ? `${options.key}:${JSON.stringify(args)}` : options.key;

      try {
        // 尝试从缓存获取
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) {
          logger.debug({ cacheKey }, 'Cache hit');
          return cached;
        }

        logger.debug({ cacheKey }, 'Cache miss');

        // 执行原方法
        const result = await originalMethod.apply(this, args);

        // 检查是否应该缓存结果
        const shouldCache = !options.condition || options.condition(result);

        if (shouldCache && result !== null && result !== undefined) {
          await cacheService.set(cacheKey, result, options.ttl || 300);
          logger.debug({ cacheKey, ttl: options.ttl }, 'Result cached');
        }

        return result;
      } catch (error) {
        logger.error({ err: error, cacheKey }, 'Cache decorator error');
        // 缓存失败时仍然执行原方法
        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * 缓存失效装饰器
 * 在方法执行后自动清除相关缓存
 *
 * @example
 * ```typescript
 * class UserService {
 *   @CacheEvict({ key: 'user' })
 *   async updateUser(id: string, data: any) {
 *     return await db.update(users).set(data).where(eq(users.id, id));
 *   }
 * }
 * ```
 */
export function CacheEvict(options: { key: string; includeArgs?: boolean }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 清除缓存
      const cacheKey = options.includeArgs !== false ? `${options.key}:${JSON.stringify(args)}` : options.key;

      try {
        await cacheService.del(cacheKey);
        logger.debug({ cacheKey }, 'Cache evicted');
      } catch (error) {
        logger.error({ err: error, cacheKey }, 'Cache eviction failed');
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * 缓存辅助函数
 */
export class CacheHelper {
  /**
   * 批量删除缓存（通过模式匹配）
   */
  static async evictByPattern(pattern: string): Promise<void> {
    try {
      // 注意：这需要 Redis SCAN 命令支持
      logger.info({ pattern }, 'Evicting cache by pattern');
      // 实现需要根据实际 Redis 客户端调整
    } catch (error) {
      logger.error({ err: error, pattern }, 'Pattern eviction failed');
    }
  }

  /**
   * 预热缓存
   */
  static async warmup<T>(key: string, dataFetcher: () => Promise<T>, ttl: number = 300): Promise<void> {
    try {
      const data = await dataFetcher();
      await cacheService.set(key, data, ttl);
      logger.info({ key }, 'Cache warmed up');
    } catch (error) {
      logger.error({ err: error, key }, 'Cache warmup failed');
    }
  }
}
