import { randomUUID } from 'node:crypto';

import { StatusCodes } from 'http-status-codes';

import { env } from '@/core/config/env';
import { getAccessPinoLogger } from '@/core/logger/pino';

import type { NextFunction, Request, Response } from 'express';

/**
 * Middleware to log HTTP requests and responses.
 * It captures request and response details, including headers and bodies,
 * and logs them using the configured access logger.
 * The middleware also generates a unique request ID for tracking.
 */

type BodyType = string | Buffer | object | Array<unknown> | void;

// 根据状态码获取日志级别
// 1xx: info, 2xx: info, 3xx: warn,
const getLogLevel = (status: number): 'error' | 'warn' | 'info' => {
  if (status >= Number(StatusCodes.INTERNAL_SERVER_ERROR)) return 'error';
  if (status >= Number(StatusCodes.BAD_REQUEST)) return 'warn';
  return 'info';
};

const addRequestId = (req: Request, res: Response, next: NextFunction) => {
  const existingId = req.headers['x-request-id'] as string;
  const requestId = existingId || randomUUID();

  // Set for downstream use
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
};

const captureResponseBody = (req: Request, res: Response, next: NextFunction) => {
  if (!env.isProduction) {
    const originalSend = res.send;
    res.send = function (body: BodyType) {
      res.locals.responseBody = body;
      return originalSend.call(this, body);
    };
  }
  next();
};

// 自定义HTTP日志中间件
const httpLogger = (req: Request, res: Response, next: NextFunction) => {
  const logger = getAccessPinoLogger();
  const requestId = req.headers['x-request-id'] as string;
  const startTime = Date.now();

  // 记录请求开始
  logger.info(
    {
      method: req.method,
      url: req.url,
      requestId,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    },
    'Request started',
  );

  // 监听响应完成
  const originalEnd = res.end;
  res.end = ((...args: Parameters<typeof res.end>) => {
    const duration = Date.now() - startTime;
    const level = getLogLevel(res.statusCode);

    logger[level](
      {
        method: req.method,
        url: req.url,
        requestId,
        statusCode: res.statusCode,
        duration,
        responseBody: !env.isProduction ? res.locals.responseBody : undefined,
      },
      'Request completed',
    );

    return originalEnd.apply(res, args);
  }) as typeof res.end;

  next();
};

export default [addRequestId, captureResponseBody, httpLogger];
