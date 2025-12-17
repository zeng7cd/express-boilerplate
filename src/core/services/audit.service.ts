/**
 * 审计日志服务
 * 记录系统中的关键操作
 */
import { db, auditLogs } from '@/core/database';
import { getAppPinoLogger } from '@/core/logger/pino';

import type { Request } from 'express';

export interface AuditLogParams {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  req: Request;
}

export class AuditService {
  private readonly logger = getAppPinoLogger();

  /**
   * 记录审计日志
   */
  async log(params: AuditLogParams): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        details: params.details || {},
        ipAddress: params.req.ip,
        userAgent: params.req.headers['user-agent'],
      });

      this.logger.info(
        {
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
        },
        'Audit log recorded',
      );
    } catch (error) {
      // 审计日志失败不应影响主流程，只记录错误
      this.logger.error({ err: error, params }, 'Failed to record audit log');
    }
  }

  /**
   * 记录认证相关操作
   */
  async logAuth(
    action: 'LOGIN' | 'LOGOUT' | 'REGISTER' | 'PASSWORD_CHANGE',
    userId: string,
    req: Request,
    details?: any,
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'auth',
      details,
      req,
    });
  }

  /**
   * 记录权限变更
   */
  async logPermissionChange(
    userId: string,
    targetUserId: string,
    action: string,
    req: Request,
    details?: any,
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'permission',
      resourceId: targetUserId,
      details,
      req,
    });
  }

  /**
   * 记录数据访问
   */
  async logDataAccess(
    userId: string,
    resource: string,
    resourceId: string,
    action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE',
    req: Request,
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource,
      resourceId,
      req,
    });
  }
}

// 导出单例
export const auditService = new AuditService();
