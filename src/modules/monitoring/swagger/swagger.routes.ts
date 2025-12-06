import { Router, type Router as ExpressRouter } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '@/core/config/swagger';

const router: ExpressRouter = Router();

/**
 * Swagger UI 路由
 */
router.use('/', swaggerUi.serve);
router.get(
  '/',
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Documentation',
  }),
);

/**
 * Swagger JSON 规范
 */
router.get('/json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

export default router;
