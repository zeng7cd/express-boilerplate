/**
 * 分页相关类型定义
 */

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number; // 页码，从 1 开始
  limit?: number; // 每页数量
  sortBy?: string; // 排序字段
  sortOrder?: 'asc' | 'desc'; // 排序方向
}

/**
 * 分页元数据
 */
export interface PaginationMeta {
  page: number; // 当前页码
  limit: number; // 每页数量
  total: number; // 总记录数
  totalPages: number; // 总页数
  hasNextPage: boolean; // 是否有下一页
  hasPrevPage: boolean; // 是否有上一页
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  data: T[]; // 数据列表
  meta: PaginationMeta; // 分页元数据
}

/**
 * 分页配置
 */
export interface PaginationConfig {
  defaultPage: number; // 默认页码
  defaultLimit: number; // 默认每页数量
  maxLimit: number; // 最大每页数量
}

/**
 * 默认分页配置
 */
export const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
};
