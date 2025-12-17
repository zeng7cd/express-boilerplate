/**
 * 请求 ID 中间件
 * 为每个请求生成唯一 ID，用于追踪和关联日志
 */
import { nanoid } from 'nanoid';

import type { Request, Response, NextFunction } from 'express';

// 扩展 Request 接口
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // 优先使用客户端提供的 request ID，否则生成新的
  req.id = (req.headers['x-request-id'] as string) || nanoid();

  // 在响应头中返回 request ID
  res.setHeader('X-Request-ID', req.id);

  next();
};
