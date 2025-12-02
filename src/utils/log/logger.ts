/**
 * 重构后的日志器API - 主要入口点
 * 提供向后兼容的接口，同时使用新的封装架构
 */

import { initializeLogSystem, loggerFactory, loggerManager } from './LoggerManager';
import type { ILogger, LoggerConfig, ModuleLoggerOptions } from './types';

// 确保日志系统已初始化
let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = initializeLogSystem();
  }
  await initPromise;
}

/**
 * 创建应用日志器 - 新的封装接口
 */
export async function createAppLogger(configOverrides?: Partial<LoggerConfig>): Promise<ILogger> {
  await ensureInitialized();
  return loggerFactory.createAppLogger(configOverrides);
}

/**
 * 创建访问日志器 - 新的封装接口
 */
export async function createAccessLogger(configOverrides?: Partial<LoggerConfig>): Promise<ILogger> {
  await ensureInitialized();
  return loggerFactory.createAccessLogger(configOverrides);
}

/**
 * 创建模块日志器 - 新的封装接口
 */
export async function createModuleLogger(options: ModuleLoggerOptions): Promise<ILogger> {
  await ensureInitialized();
  return loggerFactory.createModuleLogger(options);
}

/**
 * 创建模块专用日志器实例 - 新的封装接口
 */
export async function createModuleLoggerInstance(
  moduleName: string,
  configOverrides?: Partial<LoggerConfig>,
): Promise<ILogger> {
  await ensureInitialized();
  return loggerManager.getOrCreateModuleLogger(moduleName, configOverrides);
}

/**
 * 获取默认应用日志器 - 同步版本（向后兼容）
 */
export function getAppLogger(): ILogger {
  if (!loggerManager.isInitialized) {
    throw new Error('Logger system not initialized. Use createAppLogger() or call initializeLogSystem() first.');
  }
  return loggerFactory.getAppLogger();
}

/**
 * 获取默认访问日志器 - 同步版本（向后兼容）
 */
export function getAccessLogger(): ILogger {
  if (!loggerManager.isInitialized) {
    throw new Error('Logger system not initialized. Use createAccessLogger() or call initializeLogSystem() first.');
  }
  return loggerFactory.getAccessLogger();
}

// ==========================================
// 向后兼容的同步API（已弃用，但保留支持）
// ==========================================

import type pino from 'pino';
import { createAccessLoggerWrapper, createAppLoggerWrapper } from './LoggerWrapper';

/**
 * @deprecated 使用 createAppLogger() 替代
 * 创建应用日志器（同步，返回pino实例）
 */
export function createAppLoggerSync(configOverrides?: Partial<LoggerConfig>): pino.Logger {
  console.warn('createAppLoggerSync() is deprecated. Use createAppLogger() instead.');
  const wrapper = createAppLoggerWrapper(configOverrides);
  return wrapper.getPinoInstance();
}

/**
 * @deprecated 使用 createAccessLogger() 替代
 * 创建访问日志器（同步，返回pino实例）
 */
export function createAccessLoggerSync(configOverrides?: Partial<LoggerConfig>): pino.Logger {
  console.warn('createAccessLoggerSync() is deprecated. Use createAccessLogger() instead.');
  const wrapper = createAccessLoggerWrapper(configOverrides);
  return wrapper.getPinoInstance();
}

/**
 * @deprecated 使用 createModuleLoggerInstance() 替代
 * 创建模块日志器实例（同步，返回pino实例）
 */
export function createModuleLoggerInstanceSync(
  moduleName: string,
  configOverrides?: Partial<LoggerConfig>,
): pino.Logger {
  console.warn('createModuleLoggerInstanceSync() is deprecated. Use createModuleLoggerInstance() instead.');
  const appLogger = createAppLoggerSync(configOverrides);
  return appLogger.child({ module: moduleName });
}

/**
 * @deprecated 使用新的 createModuleLogger() 替代
 * 创建模块专用日志器（使用子日志器）
 */
export function createModuleLoggerLegacy(options: ModuleLoggerOptions): pino.Logger {
  console.warn('createModuleLoggerLegacy() is deprecated. Use createModuleLogger() instead.');
  const baseLogger = createAppLoggerSync();
  return baseLogger.child({
    module: options.module,
    ...options.context,
  });
}

// 导出管理器实例供高级用法
export { loggerManager, loggerFactory, initializeLogSystem };

// 重新导出类型和配置
export type { LoggerConfig, ModuleLoggerOptions, ILogger };
export { configManager } from './config';
