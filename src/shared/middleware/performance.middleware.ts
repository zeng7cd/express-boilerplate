/**
 * 性能监控中间件
 * 记录慢请求和性能指标
 */
import { getAppPinoLogger } from '@/core/logger/pino';

import type { Request, Response, NextFunction } from 'express';

const logger = getAppPinoLogger();

// 慢请求阈值（毫秒）
const SLOW_REQUEST_THRESHOLD = 1000; // 1 秒

/**
 * 性能监控中间件
 */
export function performanceMonitoring(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // 记录慢请求
    if (duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn(
        {
          method: req.method,
          url: req.url,
          duration,
          statusCode: res.statusCode,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
        },
        'Slow request detected',
      );
    }

    // 记录所有请求的性能指标（可选）
    if (process.env.LOG_PERFORMANCE_MONITORING === 'true') {
      logger.debug(
        {
          method: req.method,
          url: req.url,
          duration,
          statusCode: res.statusCode,
        },
        'Request completed',
      );
    }
  });

  next();
}

/**
 * 数据库查询性能监控
 */
export class QueryPerformanceMonitor {
  private static queries: Array<{
    query: string;
    duration: number;
    timestamp: Date;
  }> = [];

  /**
   * 记录查询
   */
  static recordQuery(query: string, duration: number): void {
    this.queries.push({
      query,
      duration,
      timestamp: new Date(),
    });

    // 只保留最近 100 条查询
    if (this.queries.length > 100) {
      this.queries.shift();
    }

    // 记录慢查询
    if (duration > 100) {
      // 100ms
      logger.warn(
        {
          query,
          duration,
        },
        'Slow query detected',
      );
    }
  }

  /**
   * 获取慢查询统计
   */
  static getSlowQueries(threshold: number = 100): Array<{
    query: string;
    duration: number;
    timestamp: Date;
  }> {
    return this.queries.filter((q) => q.duration > threshold);
  }

  /**
   * 获取平均查询时间
   */
  static getAverageQueryTime(): number {
    if (this.queries.length === 0) return 0;
    const total = this.queries.reduce((sum, q) => sum + q.duration, 0);
    return total / this.queries.length;
  }

  /**
   * 清除查询记录
   */
  static clear(): void {
    this.queries = [];
  }
}
