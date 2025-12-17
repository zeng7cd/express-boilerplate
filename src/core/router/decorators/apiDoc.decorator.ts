/**
 * API 文档装饰器
 * 用于自动生成 OpenAPI 文档
 */
import 'reflect-metadata';

export const API_DOC_METADATA_KEY = Symbol('apiDoc');

export interface ApiDocOptions {
  summary?: string; // 简短描述
  description?: string; // 详细描述
  tags?: string[]; // 标签
  deprecated?: boolean; // 是否废弃
  requestBody?: {
    description?: string;
    required?: boolean;
    example?: any;
  };
  responses?: {
    [statusCode: string]: {
      description: string;
      example?: any;
    };
  };
}

/**
 * API 文档装饰器
 *
 * @example
 * @ApiDoc({
 *   summary: '用户登录',
 *   description: '使用邮箱和密码登录',
 *   tags: ['认证'],
 *   responses: {
 *     '200': { description: '登录成功' },
 *     '401': { description: '认证失败' }
 *   }
 * })
 * @Post('/login')
 * async login(req: Request, res: Response) { ... }
 */
export function ApiDoc(options: ApiDocOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(API_DOC_METADATA_KEY, options, target, propertyKey);
  };
}

/**
 * API 标签装饰器
 */
export function ApiTags(...tags: string[]): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata('api:tags', tags, target);
  };
}

/**
 * API 响应装饰器
 */
export function ApiResponse(statusCode: number, description: string, example?: any): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const existingResponses = Reflect.getMetadata('api:responses', target, propertyKey) || {};
    existingResponses[statusCode] = { description, example };
    Reflect.defineMetadata('api:responses', existingResponses, target, propertyKey);
  };
}
