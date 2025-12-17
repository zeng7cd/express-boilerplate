/**
 * OpenAPI 规范生成器
 * 从装饰器元数据自动生成 OpenAPI 文档
 */
import 'reflect-metadata';
import { env } from '@/core/config/env';

import { getRegisteredControllers } from './decorators';
import { API_DOC_METADATA_KEY } from './decorators/apiDoc.decorator';
import { METADATA_KEYS } from './types';

import type { ApiDocOptions } from './decorators/apiDoc.decorator';
import type { ControllerMetadata, RouteMetadata } from './types';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * 生成 OpenAPI 规范
 */
export function generateOpenApiSpec(): OpenAPIV3.Document {
  const controllers = getRegisteredControllers();
  const paths: OpenAPIV3.PathsObject = {};
  const tags: OpenAPIV3.TagObject[] = [];
  const tagSet = new Set<string>();

  for (const ControllerClass of controllers) {
    const metadata: ControllerMetadata = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, ControllerClass);
    if (!metadata) continue;

    const routes: RouteMetadata[] = Reflect.getMetadata(METADATA_KEYS.ROUTES, ControllerClass) || [];
    const controllerTags = Reflect.getMetadata('api:tags', ControllerClass) || [];

    // 添加控制器标签
    const defaultTag = metadata.description || ControllerClass.name;
    if (!tagSet.has(defaultTag)) {
      tags.push({
        name: defaultTag,
        description: metadata.description,
      });
      tagSet.add(defaultTag);
    }

    // 处理每个路由
    for (const route of routes) {
      const fullPath = metadata.prefix + route.path;
      const apiPath = metadata.isSystemRoute ? fullPath : `/api${fullPath}`;

      // 转换为 OpenAPI 路径格式
      const openApiPath = apiPath.replace(/:(\w+)/g, '{$1}');

      if (!paths[openApiPath]) {
        paths[openApiPath] = {};
      }

      // 获取 API 文档元数据
      const apiDoc: ApiDocOptions =
        Reflect.getMetadata(API_DOC_METADATA_KEY, ControllerClass.prototype, route.handlerName) || {};

      const apiResponses = Reflect.getMetadata('api:responses', ControllerClass.prototype, route.handlerName) || {};

      // 构建操作对象
      const operation: OpenAPIV3.OperationObject = {
        summary: apiDoc.summary || route.description || route.handlerName,
        description: apiDoc.description || route.description,
        tags: apiDoc.tags || controllerTags.length > 0 ? controllerTags : [defaultTag],
        deprecated: apiDoc.deprecated,
        responses: buildResponses(apiDoc, apiResponses),
      };

      // 添加请求体
      if (apiDoc.requestBody && ['post', 'put', 'patch'].includes(route.method)) {
        operation.requestBody = {
          description: apiDoc.requestBody.description,
          required: apiDoc.requestBody.required !== false,
          content: {
            'application/json': {
              schema: { type: 'object' },
              example: apiDoc.requestBody.example,
            },
          },
        };
      }

      // 检查是否需要认证
      const isPublic = Reflect.getMetadata('route:public', ControllerClass.prototype, route.handlerName);
      if (!isPublic) {
        operation.security = [{ bearerAuth: [] }];
      } else {
        operation.security = [];
      }

      // 添加路径参数
      const pathParams = (apiPath.match(/:(\w+)/g) || []).map((param) => param.slice(1));
      if (pathParams.length > 0) {
        operation.parameters = pathParams.map((param) => ({
          name: param,
          in: 'path',
          required: true,
          schema: { type: 'string' },
        }));
      }

      paths[openApiPath][route.method] = operation;
    }
  }

  return {
    openapi: '3.0.0',
    info: {
      title: 'Express TypeScript Boilerplate API',
      version: '1.0.0',
      description: '基于 Express + TypeScript + Drizzle ORM 的后端 API 文档',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: `http://${env.HOST}:${env.PORT}`,
        description: '开发环境',
      },
    ],
    paths,
    tags,
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
            success: { type: 'boolean', description: '请求是否成功' },
            code: { type: 'string', description: '响应代码' },
            message: { type: 'string', description: '响应消息' },
            data: { type: 'object', description: '响应数据' },
            timestamp: { type: 'string', format: 'date-time', description: '响应时间戳' },
            requestId: { type: 'string', description: '请求 ID' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            code: { type: 'string', example: 'ERROR' },
            message: { type: 'string', example: 'Error message' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  };
}

/**
 * 构建响应对象
 */
function buildResponses(
  apiDoc: ApiDocOptions,
  apiResponses: Record<number, { description: string; example?: any }>,
): OpenAPIV3.ResponsesObject {
  const responses: OpenAPIV3.ResponsesObject = {};

  // 合并装饰器中的响应定义
  const allResponses = { ...apiDoc.responses, ...apiResponses };

  if (Object.keys(allResponses).length === 0) {
    // 默认响应
    responses['200'] = {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ApiResponse' },
        },
      },
    };
  } else {
    for (const [statusCode, response] of Object.entries(allResponses)) {
      const resp = response as { description: string; example?: any };
      responses[statusCode] = {
        description: resp.description,
        content: {
          'application/json': {
            schema:
              parseInt(statusCode) >= 400
                ? { $ref: '#/components/schemas/Error' }
                : { $ref: '#/components/schemas/ApiResponse' },
            example: resp.example,
          },
        },
      };
    }
  }

  return responses;
}
