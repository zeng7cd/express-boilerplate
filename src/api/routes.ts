/**
 * API 路由聚合
 * 统一管理所有业务模块路由
 */
import { Router, type Router as ExpressRouter } from 'express';
import authRoutes from '@/modules/auth/routes';
import { healthCheckRouter } from '@/modules/monitoring/healthCheck/healthCheck.routes';
import swaggerRoutes from '@/modules/monitoring/swagger/swagger.routes';

const router: ExpressRouter = Router();

/**
 * 业务模块路由
 * 这些路由会自动添加 /api 前缀
 */
router.use('/auth', authRoutes);

/**
 * 系统路由（不添加 /api 前缀）
 */
export const systemRoutes = {
  healthCheck: {
    path: '/health-check',
    router: healthCheckRouter,
    description: '系统健康检查',
  },
  swagger: {
    path: '/api-docs',
    router: swaggerRoutes,
    description: 'API 文档',
  },
} as const;

export default router;
