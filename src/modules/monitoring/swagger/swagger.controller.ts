/**
 * Swagger 文档控制器（装饰器版本）
 */
import { env } from '@/core/config/env';
import { swaggerSpec } from '@/core/config/swagger';
import { Controller, Get } from '@/core/router';

import type { Request, Response } from 'express';

@Controller('/api-docs', {
  description: 'API 文档',
  isSystemRoute: true, // 标记为系统路由，不添加 API 前缀
})
export class SwaggerController {
  /**
   * Swagger UI 页面
   */
  @Get('/', {
    description: 'Swagger UI 界面',
  })
  async swaggerUI(_req: Request, res: Response): Promise<void> {
    // 检查 Swagger 是否启用
    if (!env.SWAGGER_ENABLED) {
      res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'API documentation is not available in this environment',
      });
      return;
    }
    // 生成 Swagger UI HTML
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: '/api-docs/json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  /**
   * Swagger JSON 规范
   */
  @Get('/json', {
    description: 'Swagger JSON 规范',
  })
  async swaggerJSON(_req: Request, res: Response): Promise<void> {
    // 检查 Swagger 是否启用
    if (!env.SWAGGER_ENABLED) {
      res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'API documentation is not available in this environment',
      });
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  }
}
