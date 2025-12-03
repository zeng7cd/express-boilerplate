import { env } from '@/core/config/env';
import { createApp } from '@/server';
import { getLogger } from '@/core/logger';

async function startServer() {
  // Initialize logger system
  const logger = getLogger();

  const app = await createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server (${env.NODE_ENV}) running on http://${env.HOST}:${env.PORT}`);
  });

  /**
   * 优雅关闭服务器
   * 1. 先尝试正常关闭服务器
   * 2. 如果关闭失败，10秒后强制退出
   * @param signal - 接收到的信号类型（SIGINT/SIGTERM）
   */
  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received, initiating graceful shutdown...`);

    server.close((error) => {
      if (error) {
        logger.error('Error during server shutdown', error);
        process.exit(1);
      }
      logger.info('Server closed gracefully');
      process.exit(0);
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
