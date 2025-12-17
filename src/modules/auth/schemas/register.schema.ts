/**
 * 用户注册验证 Schema
 */
import { z } from 'zod';

import { passwordSchema, emailSchema, usernameSchema } from '@/shared/schemas/password.schema';

export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    username: usernameSchema,
    password: passwordSchema,
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
