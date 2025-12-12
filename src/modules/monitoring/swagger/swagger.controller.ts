/**
 * Swagger 文档控制器（装饰器版本）
 */
import type { Request, Response, NextFunction } from 'express';
import { Controller, Get, UseMiddleware } from '@/core/router';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '@/core/config/swagger';

@Controller('/api-docs', {
  description: 'API 文档',
  isSystemRoute: true, // 标记为系统路由，不添加 API 前缀
})
export class SwaggerController {
  /**
   * Swagger UI 页面
   */
  @UseMiddleware(...swaggerUi.serve)
  @Get('/', {
    description: 'Swagger UI 界面',
  })
  async swaggerUI(_req: Request, res: Response, next: NextFunction): Promise<void> {
    const handler = swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'API Documentation',
    });
    handler(_req, res, next);
  }

  /**
   * Swagger JSON 规范
   */
  @Get('/json', {
    description: 'Swagger JSON 规范',
  })
  async swaggerJSON(_req: Request, res: Response): Promise<void> {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  }
}
