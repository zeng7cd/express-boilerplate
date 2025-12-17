import type { ApiResponse } from '@/shared/types/response';

import type { Request, Response, NextFunction } from 'express';

/**
 * 响应拦截器中间件
 * 统一包装所有 API 响应格式
 */
export const responseInterceptor = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    // 如果已经是标准格式，直接返回
    if (body && typeof body === 'object' && 'success' in body && 'message' in body) {
      return originalJson(body);
    }

    // 包装成统一格式
    const response: ApiResponse = {
      success: res.statusCode >= 200 && res.statusCode < 300,
      code: body?.code || (res.statusCode >= 200 && res.statusCode < 300 ? 'SUCCESS' : 'ERROR'),
      message: body?.message || 'Request processed',
      data: body?.data || body,
      timestamp: new Date().toISOString(),
      requestId: req.id,
    };

    return originalJson(response);
  };

  next();
};

/**
 * 成功响应辅助函数
 */
export const sendSuccess = <T>(res: Response, data: T, message: string = 'Success', statusCode: number = 200) => {
  const response: ApiResponse<T> = {
    success: true,
    code: 'SUCCESS',
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: res.req.id,
  };

  return res.status(statusCode).json(response);
};

/**
 * 错误响应辅助函数
 */
export const sendError = (
  res: Response,
  message: string,
  code: string = 'ERROR',
  statusCode: number = 400,
  details?: any,
) => {
  const response: ApiResponse = {
    success: false,
    code,
    message,
    data: details,
    timestamp: new Date().toISOString(),
    requestId: res.req.id,
  };

  return res.status(statusCode).json(response);
};
