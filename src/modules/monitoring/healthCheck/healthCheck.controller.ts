/**
 * 健康检查控制器（装饰器版本）
 * 提供系统健康状态检查接口
 */
import { cacheService } from '@/core/cache/redis';
import { checkDatabaseHealth } from '@/core/database';
import { Controller, Get } from '@/core/router';
import { metricsCollector } from '@/shared/middleware/metrics';
import { ServiceResponse } from '@/shared/utils/serviceResponse';

import type { Request, Response } from 'express';

@Controller('/health-check', {
  description: '系统健康检查',
  isSystemRoute: true, // 标记为系统路由，不添加 API 前缀
})
export class HealthCheckController {
  /**
   * 基础健康检查
   */
  @Get('/', {
    description: '基础健康检查',
  })
  async basicHealthCheck(_req: Request, res: Response): Promise<void> {
    const serviceResponse = ServiceResponse.success('Service is healthy', {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
    res.status(serviceResponse.statusCode).send(serviceResponse);
  }

  /**
   * 详细健康检查
   */
  @Get('/detailed', {
    description: '详细健康检查',
  })
  async detailedHealthCheck(_req: Request, res: Response): Promise<void> {
    const checks = {
      database: { healthy: false, details: {} },
      redis: { healthy: false, details: {} },
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      metrics: metricsCollector.getMetrics(),
    };

    try {
      checks.database = await checkDatabaseHealth();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      checks.database = { healthy: false, details: { error: errorMessage } };
    }

    try {
      checks.redis = await cacheService.health();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      checks.redis = { healthy: false, details: { error: errorMessage } };
    }

    const isHealthy = checks.database.healthy;
    const statusCode = isHealthy ? 200 : 503;

    const serviceResponse = ServiceResponse.success(isHealthy ? 'Service is healthy' : 'Service is degraded', checks);

    res.status(statusCode).send(serviceResponse);
  }

  /**
   * 就绪检查（用于Kubernetes）
   */
  @Get('/ready', {
    description: 'Kubernetes 就绪检查',
  })
  async readinessCheck(_req: Request, res: Response): Promise<void> {
    try {
      const dbHealth = await checkDatabaseHealth();

      if (dbHealth.healthy) {
        res.status(200).json({ status: 'ready' });
      } else {
        res.status(503).json({ status: 'not ready', reason: 'database unavailable' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(503).json({ status: 'not ready', reason: errorMessage });
    }
  }

  /**
   * 存活检查（用于Kubernetes）
   */
  @Get('/live', {
    description: 'Kubernetes 存活检查',
  })
  async livenessCheck(_req: Request, res: Response): Promise<void> {
    res.status(200).json({ status: 'alive' });
  }
}
