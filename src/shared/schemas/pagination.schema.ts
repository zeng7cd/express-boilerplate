/**
 * 分页验证 Schema
 */
import { z } from 'zod';

/**
 * 分页查询参数 Schema
 */
export const paginationQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .default('1')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1)),
    limit: z
      .string()
      .optional()
      .default('20')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(100)),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

/**
 * 分页查询参数类型
 */
export type PaginationQuery = z.infer<typeof paginationQuerySchema>['query'];
