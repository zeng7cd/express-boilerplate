/**
 * 限流装饰器
 * 为特定路由配置独立的限流策略
 */
import 'reflect-metadata';

export const RATE_LIMIT_METADATA_KEY = Symbol('rateLimit');

export interface RateLimitOptions {
  windowMs: number; // 时间窗口（毫秒）
  max: number; // 最大请求数
  message?: string; // 错误消息
}

/**
 * 限流装饰器
 * 为特定路由配置独立的限流策略
 *
 * @example
 * @RateLimit({ windowMs: 15 * 60 * 1000, max: 5 })
 * @Post('/login')
 * async login(req: Request, res: Response) { ... }
 */
export function RateLimit(options: RateLimitOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    // 保存限流配置到元数据
    Reflect.defineMetadata(RATE_LIMIT_METADATA_KEY, options, target, propertyKey);
  };
}
