import '@/modules/monitoring/healthCheck/healthCheck.routes';
import authRoutes from '@/modules/auth/routes';
import { Router, type Router as ExpressRouter } from 'express';

const router: ExpressRouter = Router();

// 认证路由
router.use('/auth', authRoutes);

export default router;
