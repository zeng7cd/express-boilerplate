/**
 * 基础 Repository 类
 * 提供通用的 CRUD 操作
 */
import { db } from '@/core/database';
import type { PgTable } from 'drizzle-orm/pg-core';
import { eq, and, isNull, sql } from 'drizzle-orm';

export abstract class BaseRepository<T extends PgTable> {
  constructor(protected table: T) {}

  /**
   * 根据 ID 查找
   */
  async findById(id: string) {
    return db
      .select()
      .from(this.table as any)
      .where(eq((this.table as any).id, id))
      .limit(1)
      .then((rows) => rows[0]);
  }

  /**
   * 查找所有（支持软删除过滤）
   */
  async findAll(options?: { includeDeleted?: boolean; limit?: number; offset?: number }) {
    const conditions = [];

    if (!options?.includeDeleted && (this.table as any).deletedAt) {
      conditions.push(isNull((this.table as any).deletedAt));
    }

    return db
      .select()
      .from(this.table as any)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(options?.limit || 100)
      .offset(options?.offset || 0);
  }

  /**
   * 分页查询
   */
  async findPaginated(options: {
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
    where?: any;
    orderBy?: any;
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (!options.includeDeleted && (this.table as any).deletedAt) {
      conditions.push(isNull((this.table as any).deletedAt));
    }

    if (options.where) {
      conditions.push(options.where);
    }

    // 查询数据
    const data = await db
      .select()
      .from(this.table as any)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset)
      .orderBy(options.orderBy);

    // 查询总数
    const total = await this.count({ includeDeleted: options.includeDeleted });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * 创建
   */
  async create(data: any) {
    const [result] = await db.insert(this.table).values(data).returning();
    return result;
  }

  /**
   * 批量创建
   */
  async createMany(data: any[]) {
    return db.insert(this.table).values(data).returning();
  }

  /**
   * 更新
   */
  async update(id: string, data: any) {
    const [result] = await db
      .update(this.table)
      .set({ ...data, updatedAt: new Date() })
      .where(eq((this.table as any).id, id))
      .returning();
    return result;
  }

  /**
   * 删除（硬删除）
   */
  async delete(id: string) {
    await db.delete(this.table).where(eq((this.table as any).id, id));
  }

  /**
   * 软删除
   */
  async softDelete(id: string) {
    if (!(this.table as any).deletedAt) {
      throw new Error('Table does not support soft delete');
    }

    await db
      .update(this.table)
      .set({ deletedAt: new Date() } as any)
      .where(eq((this.table as any).id, id));
  }

  /**
   * 恢复软删除
   */
  async restore(id: string) {
    if (!(this.table as any).deletedAt) {
      throw new Error('Table does not support soft delete');
    }

    await db
      .update(this.table)
      .set({ deletedAt: null } as any)
      .where(eq((this.table as any).id, id));
  }

  /**
   * 统计数量
   */
  async count(options?: { includeDeleted?: boolean }): Promise<number> {
    const conditions = [];

    if (!options?.includeDeleted && (this.table as any).deletedAt) {
      conditions.push(isNull((this.table as any).deletedAt));
    }

    const query = db.select({ count: sql<number>`count(*)` }).from(this.table as any);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const result = await query;
    return Number(result[0]?.count || 0);
  }

  /**
   * 检查是否存在
   */
  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ id: (this.table as any).id })
      .from(this.table as any)
      .where(eq((this.table as any).id, id))
      .limit(1);

    return result.length > 0;
  }

  /**
   * 获取表名
   */
  protected abstract getTableName(): string;
}
