import { getAppPinoLogger } from '@/core/logger/pino';

import type { NextFunction, Request, Response } from 'express';

interface RequestMetrics {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  ip: string;
  userAgent?: string;
  contentLength?: number;
}

class MetricsCollector {
  private static instance: MetricsCollector;
  private logger = getAppPinoLogger();
  private requestCounts = new Map<string, number>();
  private responseTimes: number[] = [];

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  recordRequest(metrics: RequestMetrics): void {
    const { method, url, statusCode, duration, ip, userAgent, contentLength } = metrics; // 记录请求日志
    this.logger.info(
      {
        method,
        url,
        statusCode,
        duration,
        ip,
        userAgent,
        contentLength,
      },
      'HTTP Request',
    );

    // 记录慢请求
    if (duration > 1000) {
      this.logger.warn(
        {
          method,
          url,
          duration,
        },
        'Slow HTTP Request',
      );
    }

    // 记录错误请求
    if (statusCode >= 400) {
      this.logger.error(
        {
          method,
          url,
          statusCode,
          duration,
          ip,
        },
        'HTTP Error',
      );
    }

    // 收集统计数据
    const key = `${method}:${url}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
    this.responseTimes.push(duration);

    // 保持响应时间数组大小
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-500);
    }
  }

  getMetrics(): {
    totalRequests: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    requestsByEndpoint: Record<string, number>;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  } {
    const avgResponseTime =
      this.responseTimes.length > 0 ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length : 0;

    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const p95ResponseTime = sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length * 0.95)] : 0;

    return {
      totalRequests: Array.from(this.requestCounts.values()).reduce((a, b) => a + b, 0),
      avgResponseTime: Math.round(avgResponseTime),
      p95ResponseTime: Math.round(p95ResponseTime),
      requestsByEndpoint: Object.fromEntries(this.requestCounts),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    };
  }

  reset(): void {
    this.requestCounts.clear();
    this.responseTimes = [];
  }
}

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const collector = MetricsCollector.getInstance();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    collector.recordRequest({
      method,
      url: originalUrl,
      statusCode,
      duration,
      ip: ip || '',
      userAgent: req.get('User-Agent'),
      contentLength: parseInt(res.get('Content-Length') || '0'),
    });
  });

  next();
};

export const metricsCollector = MetricsCollector.getInstance();
