/**
 * 认证模块路由
 */
import { Router } from 'express';
import { authController } from './controllers/auth.controller';
import { authenticateJWT } from '@/shared/middleware/auth.middleware';

const router: Router = Router();

// 公开路由（无需认证）
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));

// 需要认证的路由
router.post('/logout', authenticateJWT, authController.logout.bind(authController));
router.get('/me', authenticateJWT, authController.me.bind(authController));

export default router;
