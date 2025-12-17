/**
 * 密码验证 Schema
 * 确保密码符合安全要求
 */
import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, '密码至少需要8个字符')
  .max(128, '密码最多128个字符')
  .regex(/[A-Z]/, '密码必须包含至少一个大写字母')
  .regex(/[a-z]/, '密码必须包含至少一个小写字母')
  .regex(/[0-9]/, '密码必须包含至少一个数字')
  .regex(/[^A-Za-z0-9]/, '密码必须包含至少一个特殊字符');

export const emailSchema = z.string().email('无效的邮箱格式').max(255, '邮箱地址过长');

export const usernameSchema = z
  .string()
  .min(3, '用户名至少需要3个字符')
  .max(20, '用户名最多20个字符')
  .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线');
