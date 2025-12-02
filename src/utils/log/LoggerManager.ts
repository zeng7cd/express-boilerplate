/**
 * 日志管理器
 * 统一管理所有日志器的生命周期和缓存
 */

import { configManager } from './config';
import {
  createAccessLoggerWrapper,
  createAppLoggerWrapper,
  createLoggerWrapper,
  createModuleLoggerWrapper,
} from './LoggerWrapper';
import type { ILogger, ILoggerManager, ILoggerWrapper, LoggerConfig, ModuleLoggerOptions } from './types';

/**
 * 日志管理器实现
 */
export class LoggerManager implements ILoggerManager {
  private static instance: LoggerManager;
  private _loggers = new Map<string, ILoggerWrapper>();
  private _isInitialized = false;
  private _defaultAppLogger?: ILoggerWrapper;
  private _defaultAccessLogger?: ILoggerWrapper;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): LoggerManager {
    if (!LoggerManager.instance) {
      LoggerManager.instance = new LoggerManager();
    }
    return LoggerManager.instance;
  }

  /**
   * 注册日志器
   */
  async register(name: string, logger: ILoggerWrapper): Promise<void> {
    if (this._loggers.has(name)) {
      throw new Error(`Logger with name "${name}" already exists`);
    }

    await logger.initialize();
    this._loggers.set(name, logger);
  }

  /**
   * 获取日志器
   */
  get(name: string): ILoggerWrapper | undefined {
    return this._loggers.get(name);
  }

  /**
   * 检查日志器是否存在
   */
  has(name: string): boolean {
    return this._loggers.has(name);
  }

  /**
   * 获取所有已注册的日志器名称
   */
  getRegisteredLoggers(): string[] {
    return Array.from(this._loggers.keys());
  }

  /**
   * 初始化管理器
   */
  async initialize(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    // 创建默认的应用日志器
    this._defaultAppLogger = createAppLoggerWrapper();
    await this.register('app', this._defaultAppLogger);

    // 创建默认的访问日志器
    this._defaultAccessLogger = createAccessLoggerWrapper();
    await this.register('access', this._defaultAccessLogger);

    this._isInitialized = true;
  }

  /**
   * 关闭管理器
   */
  async shutdown(): Promise<void> {
    if (!this._isInitialized) {
      return;
    }

    // 销毁所有日志器
    const destroyPromises = Array.from(this._loggers.values()).map((logger) => logger.destroy());

    await Promise.all(destroyPromises);

    this._loggers.clear();
    this._defaultAppLogger = undefined;
    this._defaultAccessLogger = undefined;
    this._isInitialized = false;
  }

  /**
   * 检查是否已初始化
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * 获取或创建应用日志器
   */
  getAppLogger(): ILogger {
    if (!this._defaultAppLogger) {
      throw new Error('Logger manager not initialized. Call initialize() first.');
    }
    return this._defaultAppLogger;
  }

  /**
   * 获取或创建访问日志器
   */
  getAccessLogger(): ILogger {
    if (!this._defaultAccessLogger) {
      throw new Error('Logger manager not initialized. Call initialize() first.');
    }
    return this._defaultAccessLogger;
  }

  /**
   * 创建模块日志器
   */
  createModuleLogger(options: ModuleLoggerOptions): ILogger {
    const appLogger = this.getAppLogger();
    return appLogger.child({
      module: options.module,
      ...options.context,
    });
  }

  /**
   * 创建自定义日志器
   */
  async createCustomLogger(name: string, config?: Partial<LoggerConfig>): Promise<ILogger> {
    if (this.has(name)) {
      const existingLogger = this.get(name);
      if (existingLogger) {
        return existingLogger;
      }
    }

    const logger = createLoggerWrapper(name, config);
    await this.register(name, logger);
    return logger;
  }

  /**
   * 获取或创建模块专用日志器实例
   */
  async getOrCreateModuleLogger(moduleName: string, config?: Partial<LoggerConfig>): Promise<ILogger> {
    const loggerName = `module-${moduleName}`;

    if (this.has(loggerName)) {
      const existingLogger = this.get(loggerName);
      if (existingLogger) {
        return existingLogger;
      }
    }

    const logger = createModuleLoggerWrapper(moduleName, config);
    await this.register(loggerName, logger);
    return logger;
  }

  /**
   * 移除日志器
   */
  async removeLogger(name: string): Promise<boolean> {
    const logger = this._loggers.get(name);
    if (!logger) {
      return false;
    }

    await logger.destroy();
    this._loggers.delete(name);
    return true;
  }

  /**
   * 获取日志器统计信息
   */
  getStats(): {
    totalLoggers: number;
    loggerNames: string[];
    isInitialized: boolean;
  } {
    return {
      totalLoggers: this._loggers.size,
      loggerNames: this.getRegisteredLoggers(),
      isInitialized: this._isInitialized,
    };
  }

  /**
   * 刷新所有日志器
   */
  async flushAll(): Promise<void> {
    const flushPromises = Array.from(this._loggers.values()).map((logger) => logger.flush());
    await Promise.all(flushPromises);
  }

  /**
   * 重置管理器（仅用于测试）
   */
  async reset(): Promise<void> {
    await this.shutdown();
    this._loggers.clear();
    configManager.reset();
  }
}

/**
 * 日志器工厂类
 */
export class LoggerFactory {
  private manager: LoggerManager;

  constructor(manager: LoggerManager = LoggerManager.getInstance()) {
    this.manager = manager;
  }

  /**
   * 创建应用日志器
   */
  createAppLogger(_config?: Partial<LoggerConfig>): ILogger {
    return this.manager.getAppLogger();
  }

  /**
   * 创建访问日志器
   */
  createAccessLogger(_config?: Partial<LoggerConfig>): ILogger {
    return this.manager.getAccessLogger();
  }

  /**
   * 创建模块日志器
   */
  createModuleLogger(options: ModuleLoggerOptions): ILogger {
    return this.manager.createModuleLogger(options);
  }

  /**
   * 创建自定义日志器
   */
  async createLogger(name: string, config?: Partial<LoggerConfig>): Promise<ILogger> {
    return this.manager.createCustomLogger(name, config);
  }

  /**
   * 获取默认应用日志器
   */
  getAppLogger(): ILogger {
    return this.manager.getAppLogger();
  }

  /**
   * 获取默认访问日志器
   */
  getAccessLogger(): ILogger {
    return this.manager.getAccessLogger();
  }
}

// 导出单例实例
export const loggerManager = LoggerManager.getInstance();
export const loggerFactory = new LoggerFactory(loggerManager);

/**
 * 初始化日志系统
 */
export async function initializeLogSystem(): Promise<void> {
  await loggerManager.initialize();
}

/**
 * 关闭日志系统
 */
export async function shutdownLogSystem(): Promise<void> {
  await loggerManager.shutdown();
}

/**
 * 获取日志系统状态
 */
export function getLogSystemStatus() {
  return loggerManager.getStats();
}
