/**
 * 清理任务
 * 定期清理过期数据
 */
import cron from 'cron';
import { lt } from 'drizzle-orm';

import { db, sessions, auditLogs } from '@/core/database';
import { getAppPinoLogger } from '@/core/logger/pino';

const logger = getAppPinoLogger();

/**
 * 清理过期会话
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

    logger.info('Expired sessions cleaned up');
  } catch (error) {
    logger.error({ err: error }, 'Failed to cleanup expired sessions');
  }
}

/**
 * 清理旧的审计日志（保留90天）
 */
export async function cleanupOldAuditLogs(daysToKeep: number = 90): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await db.delete(auditLogs).where(lt(auditLogs.createdAt, cutoffDate));

    logger.info({ daysToKeep }, 'Old audit logs cleaned up');
  } catch (error) {
    logger.error({ err: error }, 'Failed to cleanup old audit logs');
  }
}

/**
 * 启动定时清理任务
 */
export function startCleanupJobs(): void {
  // 每天凌晨2点清理过期会话
  const sessionCleanupJob = new cron.CronJob('0 2 * * *', async () => {
    logger.info('Starting session cleanup job');
    await cleanupExpiredSessions();
  });

  // 每周日凌晨3点清理旧的审计日志
  const auditLogCleanupJob = new cron.CronJob('0 3 * * 0', async () => {
    logger.info('Starting audit log cleanup job');
    await cleanupOldAuditLogs(90);
  });

  sessionCleanupJob.start();
  auditLogCleanupJob.start();

  logger.info('Cleanup jobs started');
}

/**
 * 停止所有定时任务
 */
export function stopCleanupJobs(): void {
  // 这里可以添加停止逻辑
  logger.info('Cleanup jobs stopped');
}
