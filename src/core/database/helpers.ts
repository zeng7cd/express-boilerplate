/**
 * Drizzle 查询辅助函数
 */
import { eq, and, or, isNull, sql } from 'drizzle-orm';

/**
 * 软删除辅助函数
 */
export const SoftDeleteHelper = {
  /**
   * 软删除条件（未删除的记录）
   */
  notDeleted: (deletedAtColumn: any) => isNull(deletedAtColumn),

  /**
   * 软删除数据
   */
  softDelete: () => ({ deletedAt: new Date() }),

  /**
   * 恢复软删除
   */
  restore: () => ({ deletedAt: null }),
};

/**
 * 乐观锁辅助函数
 */
export const OptimisticLockHelper = {
  /**
   * 创建锁条件
   */
  createLockCondition: (idColumn: any, id: string, versionColumn: any, version: number) =>
    and(eq(idColumn, id), eq(versionColumn, version)),

  /**
   * 递增版本号
   */
  incrementVersion: (data: any) => ({
    ...data,
    version: sql`${data.version} + 1`,
  }),
};

export { eq, and, or, isNull, sql };
