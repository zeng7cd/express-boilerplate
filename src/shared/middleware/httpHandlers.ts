import { StatusCodes } from 'http-status-codes';

import { ServiceResponse } from '@/shared/utils/serviceResponse';

import type { NextFunction, Request, Response } from 'express';
import type * as z from 'zod';

/**
 * Middleware to validate request parameters, query, and body using Zod schema.
 * If validation fails, it sends a formatted error response.
 *
 * @param schema - Zod schema to validate the request data against.
 * @returns Express middleware function.
 */
export const validateRequest = (schema: z.ZodType) => async (req: Request, res: Response, next: NextFunction) => {
  const data: { body: unknown; query: unknown; params: unknown } = {
    body: req.body,
    query: req.query,
    params: req.params,
  };

  const result = await schema.safeParseAsync(data);

  if (!result.success) {
    const errorDetails = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    const errorMessage = '参数验证失败';
    const statusCode = StatusCodes.BAD_REQUEST;

    const serviceResponse = ServiceResponse.failure(errorMessage, { errorDetails }, statusCode);
    return res.status(serviceResponse.statusCode).send(serviceResponse);
  }

  // 只在验证成功时调用 next()
  next();
};
