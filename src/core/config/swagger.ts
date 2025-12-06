import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

/**
 * Swagger API 文档配置
 */
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express TypeScript Boilerplate API',
      version: '1.0.0',
      description: '基于 Express + TypeScript + Drizzle ORM 的后端 API 文档',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://${env.HOST}:${env.PORT}`,
        description: '开发环境',
      },
      {
        url: 'https://api.production.com',
        description: '生产环境',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT 认证令牌',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: '请求是否成功',
            },
            code: {
              type: 'string',
              description: '响应代码',
            },
            message: {
              type: 'string',
              description: '响应消息',
            },
            data: {
              type: 'object',
              description: '响应数据',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: '响应时间戳',
            },
            requestId: {
              type: 'string',
              description: '请求 ID',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            code: {
              type: 'string',
              example: 'ERROR',
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            username: {
              type: 'string',
            },
            firstName: {
              type: 'string',
              nullable: true,
            },
            lastName: {
              type: 'string',
              nullable: true,
            },
            avatar: {
              type: 'string',
              nullable: true,
            },
            isActive: {
              type: 'boolean',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
                hasNext: { type: 'boolean' },
                hasPrev: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: '未授权',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
                timestamp: '2025-12-06T00:00:00.000Z',
              },
            },
          },
        },
        ForbiddenError: {
          description: '禁止访问',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                code: 'FORBIDDEN',
                message: 'Insufficient permissions',
                timestamp: '2025-12-06T00:00:00.000Z',
              },
            },
          },
        },
        NotFoundError: {
          description: '资源不存在',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                code: 'NOT_FOUND',
                message: 'Resource not found',
                timestamp: '2025-12-06T00:00:00.000Z',
              },
            },
          },
        },
        ValidationError: {
          description: '验证失败',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                timestamp: '2025-12-06T00:00:00.000Z',
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: '认证相关接口',
      },
      {
        name: 'Users',
        description: '用户管理接口',
      },
      {
        name: 'Roles',
        description: '角色管理接口',
      },
      {
        name: 'Health',
        description: '健康检查接口',
      },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.controller.ts', './src/api/routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
