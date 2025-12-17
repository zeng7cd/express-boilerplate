import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { env, setupRoutes } from '@/core/config';
import { testDatabaseConnection } from '@/core/database';
import errorHandler from '@/shared/middleware/errorHandler';
import { performanceMonitoring } from '@/shared/middleware/performance.middleware';
import rateLimiter from '@/shared/middleware/rateLimiter';
import { requestContextMiddleware } from '@/shared/middleware/requestContext.middleware';
import { requestIdMiddleware } from '@/shared/middleware/requestId.middleware';
import requestLogger from '@/shared/middleware/requestLogger';
import { securityHeaders } from '@/shared/middleware/security';

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

  // Helmet with CSP configuration for Swagger UI
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          imgSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
          connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
          fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        },
      },
    }),
  );

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
