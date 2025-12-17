import Redis from 'ioredis';

import { env } from '@/core/config/env';
import { getAppPinoLogger } from '@/core/logger/pino';

class CacheService {
  private redis: Redis;
  private logger = getAppPinoLogger();

  constructor() {
    this.redis = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      db: env.REDIS_DB,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      reconnectOnError: (err: Error) => {
        this.logger.error({ err }, 'Redis connection error');
        return err.message.includes('READONLY');
      },
    });

    this.redis.on('connect', () => {
      this.logger.info('Redis connected');
    });

    this.redis.on('error', (err: Error) => {
      this.logger.error({ err }, 'Redis error');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error({ err: error, key }, 'Redis get failed');
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number = 3600): Promise<boolean> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      this.logger.error({ err: error, key }, 'Redis set failed');
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      this.logger.error({ err: error, key }, 'Redis del failed');
      return false;
    }
  }

  async health(): Promise<{
    healthy: boolean;
    details: {
      ping?: string;
      memory?: string;
      error?: string;
    };
  }> {
    try {
      const pong = await this.redis.ping();
      const info = await this.redis.info('memory');

      return {
        healthy: pong === 'PONG',
        details: {
          ping: pong,
          memory: info,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        healthy: false,
        details: { error: errorMessage },
      };
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.logger.info('Redis disconnected');
    } catch (error) {
      this.logger.error({ err: error }, 'Redis disconnect failed');
    }
  }
}

export const cacheService = new CacheService();
