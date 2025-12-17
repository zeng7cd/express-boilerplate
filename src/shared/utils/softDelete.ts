/**
 * 软删除工具类
 * 提供软删除相关的查询条件和操作
 */
export class SoftDeleteHelper {
  /**
   * 获取未删除记录的查询条件
   */
  static notDeleted() {
    return {
      deletedAt: null,
    };
  }

  /**
   * 获取已删除记录的查询条件
   */
  static onlyDeleted() {
    return {
      deletedAt: {
        not: null,
      },
    };
  }

  /**
   * 软删除数据（设置 deletedAt）
   */
  static softDelete() {
    return {
      deletedAt: new Date(),
    };
  }

  /**
   * 恢复软删除的数据
   */
  static restore() {
    return {
      deletedAt: null,
    };
  }

  /**
   * 为查询条件添加软删除过滤
   */
  static withSoftDelete<T extends Record<string, any>>(where: T, includeDeleted: boolean = false): T {
    if (includeDeleted) {
      return where;
    }

    return {
      ...where,
      deletedAt: null,
    };
  }
}

/**
 * 乐观锁工具类
 * 提供版本控制相关的操作
 */
export class OptimisticLockHelper {
  /**
   * 创建乐观锁更新条件
   * @param id 记录 ID
   * @param currentVersion 当前版本号
   */
  static createLockCondition(id: string, currentVersion: number) {
    return {
      id,
      version: currentVersion,
    };
  }

  /**
   * 创建版本递增的更新数据
   * @param data 要更新的数据
   */
  static incrementVersion<T extends Record<string, any>>(data: T) {
    return {
      ...data,
      version: {
        increment: 1,
      },
    };
  }

  /**
   * 检查是否发生并发冲突
   * @param result 更新结果
   */
  static hasConflict(result: any): boolean {
    return result === null;
  }
}

/**
 * 软删除异常
 */
export class OptimisticLockException extends Error {
  constructor(message: string = 'Optimistic lock conflict: Record was modified by another transaction') {
    super(message);
    this.name = 'OptimisticLockException';
  }
}
