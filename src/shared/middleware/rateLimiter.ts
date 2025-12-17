import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

import { env } from '@/core/config/env';

interface RateLimiterOptions {
  limit?: number;
  windowMs?: number;
}

export function createRateLimiter(options?: RateLimiterOptions) {
  return rateLimit({
    legacyHeaders: true,
    limit: options?.limit ?? env.COMMON_RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    windowMs: options?.windowMs ?? env.COMMON_RATE_LIMIT_WINDOW_MS,
    keyGenerator: (req) => ipKeyGenerator(req.ip as string),
  });
}

const rateLimiter = createRateLimiter();

export default rateLimiter;
