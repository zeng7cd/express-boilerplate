/**
 * 统一的 API 响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  code: string;
  message: string;
  data?: T;
  timestamp: string;
  requestId?: string;
}

/**
 * 分页响应格式
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string; // 游标分页
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 字段过滤参数
 */
export interface FieldFilterParams {
  fields?: string[]; // 需要返回的字段
  exclude?: string[]; // 需要排除的字段
}
