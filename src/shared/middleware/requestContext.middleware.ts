/**
 * 请求上下文中间件
 * 使用 AsyncLocalStorage 存储请求上下文信息
 */
import { AsyncLocalStorage } from 'async_hooks';

import type { Request, Response, NextFunction } from 'express';

export interface RequestContext {
  requestId: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  startTime: number;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const context: RequestContext = {
    requestId: req.id,
    userId: req.user?.sub,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    startTime: Date.now(),
  };

  requestContext.run(context, () => next());
};

/**
 * 获取当前请求上下文
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}
