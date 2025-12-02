import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from '@/config/envConfig';
import setupRoutes from '@/config/routesConfig';
import { testDatabaseConnection } from '@/database';
import errorHandler from '@/middleware/errorHandler';
import rateLimiter from '@/middleware/rateLimiter';
import requestLogger from '@/middleware/requestLogger';

// Import API routes
import '@/api/routes';

async function createApp(): Promise<Express> {
  await testDatabaseConnection(); // 测试数据库连接

  const app: Express = express();

  // Set the application to trust the reverse proxy
  app.set('trust proxy', true);

  // Request logging
  app.use(requestLogger);

  // Security & parsing middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(helmet());
  app.use(rateLimiter);

  setupRoutes(app); // API Routes

  // 404 Handler
  app.use((_req, res) => {
    res.status(404).json({ message: 'Not Found' });
  });

  app.use(errorHandler); // Error handler

  return app;
}

export { createApp };
