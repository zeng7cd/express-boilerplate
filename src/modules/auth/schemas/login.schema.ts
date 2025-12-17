/**
 * 用户登录验证 Schema
 */
import { z } from 'zod';

import { emailSchema } from '@/shared/schemas/password.schema';

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, '密码不能为空'),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
