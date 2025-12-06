import type { PaginatedResponse, PaginationParams } from '@/shared/types/response';

/**
 * 分页工具类
 */
export class PaginationHelper {
  /**
   * 创建分页响应
   */
  static createResponse<T>(items: T[], total: number, page: number, limit: number): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * 解析分页参数
   */
  static parseParams(params: PaginationParams): {
    page: number;
    limit: number;
    skip: number;
    take: number;
  } {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10)); // 限制最大 100 条
    const skip = (page - 1) * limit;

    return {
      page,
      limit,
      skip,
      take: limit,
    };
  }

  /**
   * 创建数据库分页查询参数
   */
  static toDbParams(params: PaginationParams) {
    const { skip, take } = this.parseParams(params);

    return {
      skip,
      take,
      orderBy: params.sortBy
        ? {
            [params.sortBy]: params.sortOrder || 'asc',
          }
        : undefined,
    };
  }

  /**
   * 游标分页（性能更好）
   */
  static createCursorParams(cursor?: string, limit: number = 10) {
    return {
      take: limit,
      ...(cursor && {
        skip: 1, // 跳过游标本身
        cursor: {
          id: cursor,
        },
      }),
    };
  }
}

/**
 * 字段过滤工具
 */
export class FieldFilterHelper {
  /**
   * 根据字段列表创建数据库 select 对象
   */
  static createSelect(fields?: string[]): Record<string, boolean> | undefined {
    if (!fields || fields.length === 0) {
      return undefined;
    }

    return fields.reduce(
      (acc, field) => {
        acc[field] = true;
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }

  /**
   * 过滤对象字段
   */
  static filterFields<T extends Record<string, any>>(obj: T, fields?: string[], exclude?: string[]): Partial<T> {
    if (!fields && !exclude) {
      return obj;
    }

    const result: any = {};

    if (fields) {
      // 只包含指定字段
      for (const field of fields) {
        if (field in obj) {
          result[field] = obj[field];
        }
      }
    } else {
      // 排除指定字段
      for (const key in obj) {
        if (!exclude?.includes(key)) {
          result[key] = obj[key];
        }
      }
    }

    return result;
  }
}
