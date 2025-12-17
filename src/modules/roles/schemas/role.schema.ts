/**
 * 角色验证模式
 */
import { z } from 'zod';

/**
 * 创建角色请求验证
 */
export const createRoleSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Role name must be at least 2 characters')
      .max(50, 'Role name must not exceed 50 characters')
      .regex(/^[a-z0-9_-]+$/, 'Role name must contain only lowercase letters, numbers, hyphens and underscores'),
    displayName: z
      .string()
      .min(2, 'Display name must be at least 2 characters')
      .max(100, 'Display name must not exceed 100 characters'),
    description: z.string().max(500, 'Description must not exceed 500 characters').optional(),
    permissionIds: z.array(z.string()).optional(),
  }),
});

/**
 * 更新角色请求验证
 */
export const updateRoleSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Role ID is required'),
  }),
  body: z.object({
    displayName: z
      .string()
      .min(2, 'Display name must be at least 2 characters')
      .max(100, 'Display name must not exceed 100 characters')
      .optional(),
    description: z.string().max(500, 'Description must not exceed 500 characters').optional(),
    isActive: z.boolean().optional(),
    permissionIds: z.array(z.string()).optional(),
  }),
});

/**
 * 角色ID参数验证
 */
export const roleIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Role ID is required'),
  }),
});

/**
 * 分配权限请求验证
 */
export const assignPermissionsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Role ID is required'),
  }),
  body: z.object({
    permissionIds: z.array(z.string()).min(1, 'At least one permission ID is required'),
  }),
});

/**
 * 角色列表查询验证
 */
export const roleListQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    search: z.string().optional(),
    includeInactive: z
      .string()
      .regex(/^(true|false)$/)
      .optional(),
  }),
});
