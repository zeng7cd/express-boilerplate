import express, { type Request, type Response, type Router } from 'express';
import { cacheService } from '@/cache/redis';
import { ServiceResponse } from '@/common/serviceResponse';
import { checkDatabaseHealth } from '@/database';
import { metricsCollector } from '@/middleware/metrics';
import { registerRoute } from '@/utils/routeRegistry';

export const healthCheckRouter: Router = express.Router();

// 基础健康检查
healthCheckRouter.get('/', (_req: Request, res: Response) => {
  const serviceResponse = ServiceResponse.success('Service is healthy', {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
  res.status(serviceResponse.statusCode).send(serviceResponse);
});

// 详细健康检查
healthCheckRouter.get('/detailed', async (_req: Request, res: Response) => {
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

  const isHealthy = checks.database.healthy; // && checks.redis.healthy;
  const statusCode = isHealthy ? 200 : 503;

  const serviceResponse = ServiceResponse.success(isHealthy ? 'Service is healthy' : 'Service is degraded', checks);

  res.status(statusCode).send(serviceResponse);
});

// 就绪检查（用于Kubernetes）
healthCheckRouter.get('/ready', async (_req: Request, res: Response) => {
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
});

// 存活检查（用于Kubernetes）
healthCheckRouter.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

// 自动注册健康检查路由
// 注意：使用独立路径，不受API前缀影响，便于负载均衡器和监控系统访问
registerRoute('/health-check', healthCheckRouter, '系统健康检查');
