/**
 * 重构后日志系统的使用示例
 * 展示新的封装API和最佳实践
 */

import {
  ConfigPresets,
  configManager,
  createAppLogger,
  createModuleLogger,
  getDefaultLogger,
  getLogSystemStatus,
  type ILogger,
  initializeLogSystem,
  quickAppLogger,
  quickModuleLogger,
  shutdownLogSystem,
} from '../index';

// ========================================
// 示例1: 基础使用
// ========================================

async function basicUsageExample() {
  console.log('\n=== 基础使用示例 ===');

  // 创建应用日志器
  const appLogger = await createAppLogger();

  // 各种日志级别
  appLogger.debug('调试信息', { component: 'app' });
  appLogger.info('应用启动成功', { port: 3000, env: 'development' });
  appLogger.warn('配置缺失，使用默认值', { config: 'database.timeout' });
  appLogger.error('连接失败', { error: 'ECONNREFUSED', retryCount: 3 });

  // 错误对象日志
  try {
    throw new Error('模拟错误');
  } catch (error) {
    appLogger.error(error as Error, '捕获到错误', { operation: '示例操作' });
  }
}

// ========================================
// 示例2: 模块日志器
// ========================================

async function moduleLoggerExample() {
  console.log('\n=== 模块日志器示例 ===');

  // 创建用户服务日志器
  const userLogger = await createModuleLogger({
    module: 'user-service',
    context: {
      service: 'UserService',
      version: '2.0.0',
    },
  });

  userLogger.info('用户服务初始化完成');
  userLogger.info('处理用户请求', { userId: 123, action: 'login' });

  // 创建订单服务日志器
  const orderLogger = await createModuleLogger({
    module: 'order-service',
    context: {
      service: 'OrderService',
      database: 'orders_db',
    },
  });

  orderLogger.info('订单服务启动', { workers: 4 });
}

// ========================================
// 示例3: 子日志器和上下文传递
// ========================================

async function childLoggerExample() {
  console.log('\n=== 子日志器示例 ===');

  const baseLogger = await createAppLogger();

  // 为特定请求创建子日志器
  const requestLogger = baseLogger.child({
    requestId: 'req-123456',
    userId: 'user-789',
    ip: '192.168.1.100',
  });

  requestLogger.info('处理用户请求', { endpoint: '/api/users' });
  requestLogger.info('数据库查询', { table: 'users', duration: 45 });
  requestLogger.info('请求处理完成', { statusCode: 200 });

  // 创建操作特定的子日志器
  const operationLogger = requestLogger.child({
    operation: 'updateUserProfile',
    transactionId: 'tx-abc123',
  });

  operationLogger.info('开始更新用户资料');
  operationLogger.info('验证权限通过');
  operationLogger.info('资料更新成功');
}

// ========================================
// 示例4: 配置管理
// ========================================

async function configurationExample() {
  console.log('\n=== 配置管理示例 ===');

  // 使用配置预设
  configManager.setGlobalOverrides(ConfigPresets.development());

  const devLogger = await createAppLogger();
  devLogger.info('使用开发环境配置');

  // 切换到生产环境配置
  configManager.setGlobalOverrides(ConfigPresets.production());

  const prodLogger = await createAppLogger();
  prodLogger.info('使用生产环境配置');

  // 为特定日志器设置配置
  configManager.setLoggerOverrides('payment-service', {
    level: 'warn',
    logToFile: true,
    fileConfig: {
      maxSize: '100m',
      maxFiles: 30,
      directory: 'payment-logs',
      filePrefix: 'payment',
    },
  });

  const paymentLogger = await createModuleLogger({
    module: 'payment-service',
  });

  paymentLogger.warn('支付服务警告', { amount: 1000 });
}

// ========================================
// 示例5: 便利函数
// ========================================

async function convenienceFunctionsExample() {
  console.log('\n=== 便利函数示例 ===');

  // 快速创建调试级别的应用日志器
  const debugLogger = await quickAppLogger('debug');
  debugLogger.debug('这是调试信息');

  // 快速创建模块日志器
  const apiLogger = await quickModuleLogger('api-gateway', 'info');
  apiLogger.info('API网关服务启动');

  // 使用默认日志器
  const defaultLogger = await getDefaultLogger();
  defaultLogger.info('使用默认日志器');
}

// ========================================
// 示例6: 错误处理最佳实践
// ========================================

async function errorHandlingExample() {
  console.log('\n=== 错误处理示例 ===');

  const logger = await createAppLogger();

  // 模拟不同类型的错误处理
  try {
    // 模拟数据库错误
    throw new Error('Database connection timeout');
  } catch (error) {
    logger.error(error as Error, '数据库连接超时', {
      database: 'users_db',
      host: 'localhost:5432',
      retryAttempt: 1,
    });
  }

  try {
    // 模拟验证错误
    throw new Error('Invalid user credentials');
  } catch (error) {
    logger.warn('用户认证失败', {
      error: (error as Error).message,
      userId: 'unknown',
      ip: '192.168.1.100',
    });
  }

  // 业务逻辑错误
  logger.error('业务规则违反', {
    rule: 'max_daily_transactions',
    value: 1000,
    limit: 500,
    userId: 'user-123',
  });
}

// ========================================
// 示例7: 生命周期管理
// ========================================

async function lifecycleManagementExample() {
  console.log('\n=== 生命周期管理示例 ===');

  // 手动初始化日志系统
  await initializeLogSystem();

  // 获取系统状态
  const status = getLogSystemStatus();
  console.log('日志系统状态:', status);

  // 创建多个日志器
  const logger1 = await createAppLogger();
  const logger2 = await createModuleLogger({ module: 'test-module' });

  logger1.info('系统初始化完成');
  logger2.info('测试模块加载');

  // 获取更新后的状态
  const updatedStatus = getLogSystemStatus();
  console.log('更新后的状态:', updatedStatus);

  // 刷新所有日志器
  await logger1.flush();
  await logger2.flush();

  console.log('所有日志器已刷新');
}

// ========================================
// 示例8: 模拟实际应用场景
// ========================================

class UserService {
  private logger!: ILogger;
  private initialized = false;

  constructor() {
    this.initLogger();
  }

  private async initLogger() {
    this.logger = await createModuleLogger({
      module: 'user-service',
      context: {
        service: 'UserService',
        version: '1.0.0',
      },
    });
    this.initialized = true;
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initLogger();
    }
  }

  async createUser(userData: { email: string; name: string }) {
    await this.ensureInitialized();

    const operationLogger = this.logger.child({
      operation: 'createUser',
      email: userData.email,
    });

    operationLogger.info('开始创建用户');

    try {
      // 模拟验证
      operationLogger.debug('验证用户数据', userData);

      // 模拟数据库操作
      operationLogger.info('保存用户到数据库');
      const userId = 'user-' + Math.random().toString(36).substr(2, 9);

      // 模拟发送欢迎邮件
      operationLogger.info('发送欢迎邮件');

      operationLogger.info('用户创建成功', { userId });
      return { id: userId, ...userData };
    } catch (error) {
      operationLogger.error(error as Error, '用户创建失败');
      throw error;
    }
  }
}

async function realWorldExample() {
  console.log('\n=== 实际应用场景示例 ===');

  const userService = new UserService();

  try {
    const user = await userService.createUser({
      email: 'user@example.com',
      name: 'Test User',
    });

    console.log('创建的用户:', user);
  } catch (error) {
    console.error('用户创建失败:', error);
  }
}

// ========================================
// 运行所有示例
// ========================================

async function runAllExamples() {
  console.log('🎯 日志系统重构后的使用示例');
  console.log('=====================================');

  try {
    await basicUsageExample();
    await moduleLoggerExample();
    await childLoggerExample();
    await configurationExample();
    await convenienceFunctionsExample();
    await errorHandlingExample();
    await lifecycleManagementExample();
    await realWorldExample();

    console.log('\n✅ 所有示例运行完成！');

    // 优雅关闭
    console.log('\n🔄 正在关闭日志系统...');
    await shutdownLogSystem();
    console.log('✅ 日志系统已关闭');
  } catch (error) {
    console.error('❌ 示例运行出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  basicUsageExample,
  moduleLoggerExample,
  childLoggerExample,
  configurationExample,
  convenienceFunctionsExample,
  errorHandlingExample,
  lifecycleManagementExample,
  realWorldExample,
  runAllExamples,
  UserService,
};
