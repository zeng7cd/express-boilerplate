import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';

import { env } from '@/core/config/env';
import { getAppPinoLogger } from '@/core/logger/pino';
import { AppException } from '@/shared/exceptions';
import { ServiceResponse } from '@/shared/utils/serviceResponse';

import { getRequestContext } from './requestContext.middleware';

import type { ErrorRequestHandler } from 'express';

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const logger = getAppPinoLogger();
  const context = getRequestContext();

  // 记录错误日志，包含请求上下文
  logger.error(
    {
      err,
      requestId: context?.requestId,
      userId: context?.userId,
      path: req.path,
      method: req.method,
    },
    'Error occurred',
  );

  // 处理自定义应用异常
  if (err instanceof AppException) {
    const response = ServiceResponse.failure(
      err.message,
      {
        code: err.code,
        details: env.isProduction ? undefined : err.details,
      },
      err.statusCode,
    );

    return res.status(err.statusCode).json(response);
  }

  // 处理 Zod 验证错误
  if (err instanceof ZodError) {
    const response = ServiceResponse.failure(
      'Validation failed',
      {
        code: 'VALIDATION_ERROR',
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      StatusCodes.BAD_REQUEST,
    );

    return res.status(StatusCodes.BAD_REQUEST).json(response);
  }

  // 处理数据库错误
  if (err.code?.startsWith('P') || err.code === '23505') {
    const response = ServiceResponse.failure(
      'Database error',
      {
        code: 'DATABASE_ERROR',
        details: env.isProduction ? undefined : err.message,
      },
      StatusCodes.INTERNAL_SERVER_ERROR,
    );

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(response);
  }

  // 处理未知错误
  const statusCode = err.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';

  const responseData = {
    code: err.code || 'UNEXPECTED_ERROR',
    details: env.isProduction ? undefined : err.stack,
  };

  const response = ServiceResponse.failure(message, responseData, statusCode);

  res.status(statusCode).json(response);
};

export default errorHandler;
