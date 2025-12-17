/**
 * 基础 Repository 类
 * 提供通用的 CRUD 操作
 */
import { eq, and, isNull, sql } from 'drizzle-orm';

import { db } from '@/core/database';

import type { MySqlTable } from 'drizzle-orm/mysql-core';

export abstract class BaseRepository<T extends MySqlTable> {
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

    const conditions = this.buildConditions({
      includeDeleted: options.includeDeleted,
      where: options.where,
    });

    // 并行查询数据和总数
    const [data, total] = await Promise.all([
      this.queryWithConditions(conditions, { limit, offset, orderBy: options.orderBy }),
      this.count({ includeDeleted: options.includeDeleted }),
    ]);

    return this.buildPaginationResult(data, { page, limit, total });
  }

  /**
   * 构建查询条件
   */
  private buildConditions(options: { includeDeleted?: boolean; where?: any }) {
    const conditions = [];

    if (!options.includeDeleted && (this.table as any).deletedAt) {
      conditions.push(isNull((this.table as any).deletedAt));
    }

    if (options.where) {
      conditions.push(options.where);
    }

    return conditions;
  }

  /**
   * 使用条件查询
   */
  private async queryWithConditions(conditions: any[], options: { limit: number; offset: number; orderBy?: any }) {
    return db
      .select()
      .from(this.table as any)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(options.limit)
      .offset(options.offset)
      .orderBy(options.orderBy);
  }

  /**
   * 构建分页结果
   */
  private buildPaginationResult(data: any[], meta: { page: number; limit: number; total: number }) {
    const totalPages = Math.ceil(meta.total / meta.limit);
    return {
      data,
      meta: {
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
        totalPages,
        hasNextPage: meta.page < totalPages,
        hasPrevPage: meta.page > 1,
      },
    };
  }

  /**
   * 创建
   */
  async create(data: any) {
    await db.insert(this.table).values(data);
    // MySQL 不支持 returning，需要重新查询
    const [result] = await db
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, data.id));
    return result;
  }

  /**
   * 批量创建
   */
  async createMany(data: any[]) {
    await db.insert(this.table).values(data);
    // MySQL 不支持 returning，返回插入的数据
    return data;
  }

  /**
   * 更新
   */
  async update(id: string, data: any) {
    await db
      .update(this.table)
      .set({ ...data, updatedAt: new Date() })
      .where(eq((this.table as any).id, id));
    // MySQL 不支持 returning，需要重新查询
    const [result] = await db
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id));
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
