import pino from 'pino';

import { createPinoConfig } from './config';

/**
 * Pino日志器工厂函数
 * 提供统一的日志器创建接口，替代原有的封装日志功能
 */

/**
 * 创建应用主日志器
 * 替代原有的 createAppLogger()
 */
export function createAppPinoLogger(): pino.Logger {
  const config = createPinoConfig('app', 'app.log');
  return pino(config);
}

/**
 * 创建访问日志器
 * 替代原有的 getAccessLogger()
 */
export function createAccessPinoLogger(): pino.Logger {
  const config = createPinoConfig('access', 'access.log');
  return pino(config);
}

/**
 * 创建模块日志器
 * 替代原有的 createModuleLogger()
 */
export function createModulePinoLogger(moduleName: string, context?: Record<string, unknown>): pino.Logger {
  const config = createPinoConfig(`module-${moduleName}`, `${moduleName}.log`);
  const logger = pino(config);

  if (context) {
    return logger.child({
      module: moduleName,
      ...context,
    });
  }

  return logger.child({ module: moduleName });
}

/**
 * 创建自定义日志器
 */
export function createCustomPinoLogger(
  name: string,
  logFileName?: string,
  context?: Record<string, unknown>,
): pino.Logger {
  const config = createPinoConfig(name, logFileName);
  const logger = pino(config);

  if (context) {
    return logger.child(context);
  }

  return logger;
}

/**
 * 缓存的全局日志器实例
 */
let _appLogger: pino.Logger | null = null;
let _accessLogger: pino.Logger | null = null;

/**
 * 获取全局应用日志器实例（单例模式）
 */
export function getAppPinoLogger(): pino.Logger {
  if (!_appLogger) {
    _appLogger = createAppPinoLogger();
  }
  return _appLogger;
}

/**
 * 获取全局访问日志器实例（单例模式）
 */
export function getAccessPinoLogger(): pino.Logger {
  if (!_accessLogger) {
    _accessLogger = createAccessPinoLogger();
  }
  return _accessLogger;
}

/**
 * 重置缓存的日志器实例（主要用于测试）
 */
export function resetPinoLoggers(): void {
  _appLogger = null;
  _accessLogger = null;
}
