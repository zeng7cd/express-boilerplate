/**
 * 中间件工厂
 * 提供统一的中间件创建和错误处理
 */
import type { Request, Response, NextFunction } from 'express';

export type MiddlewareHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

/**
 * 创建带有统一错误处理的中间件
 */
export function createMiddleware(handler: MiddlewareHandler) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * 创建异步中间件（别名）
 */
export const asyncMiddleware = createMiddleware;
