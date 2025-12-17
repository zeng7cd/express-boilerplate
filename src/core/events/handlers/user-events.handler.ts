/**
 * 用户事件处理器
 * 处理用户相关的事件
 */
import { getAppPinoLogger } from '@/core/logger/pino';

import { eventBus } from '../event-bus';

const logger = getAppPinoLogger();

/**
 * 初始化用户事件处理器
 */
export function initUserEventHandlers(): void {
  // 处理用户注册事件
  eventBus.subscribe('user.registered', async (data) => {
    logger.info({ userId: data.userId, email: data.email }, 'User registered event received');

    // 这里可以添加更多逻辑，例如：
    // - 发送欢迎邮件
    // - 创建默认设置
    // - 发送通知给管理员
    // - 记录到分析系统

    // 示例：记录到日志
    logger.info(
      {
        event: 'user_registered',
        userId: data.userId,
        email: data.email,
        timestamp: data.timestamp,
      },
      'New user registered',
    );
  });

  // 处理用户登录事件
  eventBus.subscribe('user.login', async (data) => {
    logger.info({ userId: data.userId, email: data.email }, 'User login event received');

    // 这里可以添加更多逻辑，例如：
    // - 更新登录统计
    // - 检测异常登录
    // - 发送登录通知
    // - 更新用户活跃度

    logger.debug(
      {
        event: 'user_login',
        userId: data.userId,
        email: data.email,
        ip: data.ip,
        timestamp: data.timestamp,
      },
      'User logged in',
    );
  });

  // 处理用户登出事件
  eventBus.subscribe('user.logout', async (data) => {
    logger.info({ userId: data.userId }, 'User logout event received');

    // 这里可以添加更多逻辑，例如：
    // - 清理用户会话
    // - 更新在线状态
    // - 记录登出时间

    logger.debug(
      {
        event: 'user_logout',
        userId: data.userId,
        timestamp: data.timestamp,
      },
      'User logged out',
    );
  });

  logger.info('User event handlers initialized');
}
