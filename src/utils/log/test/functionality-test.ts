/**
 * 优化后功能完整性测试
 * 验证所有日志器功能是否正常工作
 */

import { createAccessLogger, createAppLogger, createModuleLogger } from '../index';

async function runTests() {
  // 测试应用日志器
  console.log('=== 测试应用日志器 ===');
  const appLogger = await createAppLogger();
  appLogger.info('测试应用日志器');
  appLogger.debug('测试调试信息');
  appLogger.warn('测试警告信息');
  appLogger.error('测试错误信息');

  // 测试访问日志器
  console.log('\n=== 测试访问日志器 ===');
  const accessLogger = await createAccessLogger();
  accessLogger.info('测试访问日志器');

  // 测试模块日志器
  console.log('\n=== 测试模块日志器 ===');
  const moduleLogger = await createModuleLogger({
    module: 'test-module',
    context: { testId: '12345' },
  });
  moduleLogger.info('测试模块日志器');

  // 测试子日志器
  console.log('\n=== 测试子日志器 ===');
  const childLogger = appLogger.child({ requestId: 'req-123' });
  childLogger.info('测试子日志器');

  // 测试自定义配置
  console.log('\n=== 测试自定义配置 ===');
  const customLogger = await createAppLogger({
    level: 'debug',
    logToFile: false,
  });
  customLogger.debug('测试自定义配置的调试日志');

  console.log('\n=== 功能测试完成 ===');
}

// 运行测试
runTests().catch(console.error);
