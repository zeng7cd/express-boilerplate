/**
 * 认证相关装饰器
 * 提供便捷的认证和权限控制装饰器
 */
import { authenticateJWT } from '@/shared/middleware/auth.middleware';

import { UseMiddleware } from '../decorators';

/**
 * 需要认证装饰器
 * 应用 JWT 认证中间件
 */
export function Auth(): MethodDecorator & ClassDecorator {
  return UseMiddleware(authenticateJWT);
}

/**
 * 公开路由装饰器（无需认证）
 * 这是一个标记装饰器，用于明确标识公开路由
 */
export function Public(): MethodDecorator {
  return (_target: unknown, _propertyKey: string | symbol) => {
    // 这是一个标记装饰器，不执行任何操作
    // 主要用于代码可读性和文档目的
  };
}
