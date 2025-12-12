import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from '@/core/config/env';
import setupRoutes from '@/core/config/routes';
import { testDatabaseConnection } from '@/core/database';
import errorHandler from '@/shared/middleware/errorHandler';
import rateLimiter from '@/shared/middleware/rateLimiter';
import requestLogger from '@/shared/middleware/requestLogger';
import { requestIdMiddleware } from '@/shared/middleware/requestId.middleware';
import { requestContextMiddleware } from '@/shared/middleware/requestContext.middleware';
import { securityHeaders } from '@/shared/middleware/security';
import { performanceMonitoring } from '@/shared/middleware/performance.middleware';

async function createApp(): Promise<Express> {
  // 导入所有控制器（触发装饰器注册）
  await import('@/controllers');

  await testDatabaseConnection(); // 测试数据库连接

  const app: Express = express();

  // Set the application to trust the reverse proxy
  app.set('trust proxy', true);

  // Request ID middleware (must be first)
  app.use(requestIdMiddleware);

  // Request context middleware
  app.use(requestContextMiddleware);

  // Performance monitoring
  app.use(performanceMonitoring);

  // Request logging
  app.use(requestLogger);

  // Security headers
  app.use(securityHeaders);

  // Compression middleware (before other middlewares)
  app.use(
    compression({
      filter: (req, res) => {
        // 不压缩已经压缩的内容
        if (req.headers['x-no-compression']) {
          return false;
        }
        // 使用默认的压缩过滤器
        return compression.filter(req, res);
      },
      level: 6, // 压缩级别 (0-9)，6 是平衡性能和压缩率的推荐值
      threshold: 1024, // 只压缩大于 1KB 的响应
    }),
  );

  // Security & parsing middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(helmet());
  app.use(rateLimiter);

  setupRoutes(app); // API Routes

  // 404 Handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: 'Resource not found',
    });
  });

  app.use(errorHandler); // Error handler

  return app;
}

export { createApp };
