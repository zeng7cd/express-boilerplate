import rateLimit from 'express-rate-limit';

import { getAppPinoLogger } from '@/core/logger/pino';

import type { NextFunction, Request, Response } from 'express';

// 创建不同级别的速率限制器
export const createStrictRateLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message || 'Too many requests',
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    // 使用默认的 keyGenerator，它已经正确处理了 IPv4 和 IPv6
    // 默认使用 req.ip，在 Express 中设置 trust proxy 后会正确获取客户端 IP
  });
};

// 为不同类型的端点创建限制器
export const authRateLimiter = createStrictRateLimiter(
  15 * 60 * 1000, // 15分钟
  5, // 5次尝试
  'Too many authentication attempts',
);

export const apiRateLimiter = createStrictRateLimiter(
  15 * 60 * 1000, // 15分钟
  100, // 100次请求
  'API rate limit exceeded',
);

export const strictApiRateLimiter = createStrictRateLimiter(
  60 * 1000, // 1分钟
  10, // 10次请求
  'Strict API rate limit exceeded',
);

// 输入清理中间件
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const logger = getAppPinoLogger();

  const sanitizeObject = <T>(obj: T): T => {
    if (typeof obj === 'string') {
      // 移除潜在的XSS攻击代码
      // 使用更安全的正则表达式，避免 ReDoS 攻击
      return obj
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '') as T;
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          obj[key] = sanitizeObject(obj[key]);
        }
      }
    }

    return obj;
  };

  try {
    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);
  } catch (error) {
    logger.error({ err: error }, 'Input sanitization failed');
  }

  next();
};

// 安全头中间件
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // 设置安全相关的HTTP头
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 在生产环境中启用HSTS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

// IP白名单中间件
export const createIPWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || '';

    if (!allowedIPs.includes(clientIP)) {
      const logger = getAppPinoLogger();
      logger.warn({ clientIP, allowedIPs }, 'IP not in whitelist');

      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not authorized',
      });
    }
    next();
  };
};

// API密钥验证中间件
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    // 如果没有配置API密钥，跳过验证
    return next();
  }

  if (!apiKey || apiKey !== validApiKey) {
    const logger = getAppPinoLogger();
    logger.warn(
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        providedKey: apiKey ? 'provided' : 'missing',
      },
      'Invalid API key attempt',
    );

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid API key required',
    });
  }

  next();
};
