/**
 * 路由装饰器系统导出
 */
export { Controller, Get, Post, Put, Patch, Delete, Options, Head, UseMiddleware } from './decorators';

export { Auth, Public } from './decorators/auth.decorators';

export { Validate } from './decorators/validate.decorator';

export { RateLimit } from './decorators/rateLimit.decorator';

export type { RateLimitOptions } from './decorators/rateLimit.decorator';

export { registerRoutes } from './registry';

export type { HttpMethod, RouteMetadata, ControllerMetadata, ControllerConstructor } from './types';
