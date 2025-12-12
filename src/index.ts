import 'reflect-metadata'; // 必须在最前面导入，用于装饰器元数据
import { env } from '@/core/config/env';
import { createApp } from '@/server';
import { getLogger } from '@/core/logger';
import { startCleanupJobs, stopCleanupJobs } from '@/core/jobs/cleanup.job';
import { closeDatabaseConnection } from '@/core/database';
import { cacheService } from '@/core/cache';

async function startServer() {
  // Initialize logger system
  const logger = getLogger();

  const app = await createApp();

  // 启动定时清理任务
  startCleanupJobs();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server (${env.NODE_ENV}) running on http://${env.HOST}:${env.PORT}`);
  });

  /**
   * 优雅关闭服务器
   * 1. 停止接受新请求
   * 2. 停止定时任务
   * 3. 关闭数据库连接
   * 4. 关闭 Redis 连接
   * 5. 如果关闭失败，10秒后强制退出
   * @param signal - 接收到的信号类型（SIGINT/SIGTERM）
   */
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received, initiating graceful shutdown...`);

    // 停止接受新请求
    server.close(async (error) => {
      if (error) {
        logger.error('Error during server shutdown', error);
      } else {
        logger.info('Server closed gracefully');
      }

      try {
        // 停止定时任务
        stopCleanupJobs();
        logger.info('Cleanup jobs stopped');

        // 关闭数据库连接
        await closeDatabaseConnection();
        logger.info('Database connection closed');

        // 关闭 Redis 连接
        await cacheService.disconnect();
        logger.info('Redis connection closed');

        process.exit(error ? 1 : 0);
      } catch (shutdownError) {
        logger.error('Error during graceful shutdown', shutdownError as Error);
        process.exit(1);
      }
    });

    // 强制关闭超时保护
    setTimeout(() => {
      logger.error('Force shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
