/**
 * 输入验证装饰器
 * 自动应用 Zod schema 验证到路由方法
 */
import 'reflect-metadata';
import type { z } from 'zod';

export const VALIDATE_METADATA_KEY = Symbol('validate');

/**
 * 验证装饰器
 * 自动应用 Zod schema 验证
 *
 * @example
 * @Validate(loginSchema)
 * @Post('/login')
 * async login(req: Request, res: Response) { ... }
 */
export function Validate(schema: z.ZodTypeAny): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    // 保存验证 schema 到元数据
    Reflect.defineMetadata(VALIDATE_METADATA_KEY, schema, target, propertyKey);
  };
}
