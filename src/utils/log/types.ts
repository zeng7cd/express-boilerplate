/**
 * 重构后的日志系统类型定义
 * 提供完整的抽象层，隐藏底层实现细节
 */

import type pino from 'pino';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * 文件日志配置
 */
export interface FileLogConfig {
  maxSize: string;
  maxFiles: number;
  directory: string;
  filePrefix?: string;
}

/**
 * 日志器配置
 */
export interface LoggerConfig {
  level: LogLevel;
  isDevelopment: boolean;
  logToFile: boolean;
  prettyPrint: boolean;
  fileConfig?: FileLogConfig;
  /** 自定义序列化器 */
  serializers?: Record<string, pino.SerializerFn>;
  /** 自定义格式化器 */
  formatters?: {
    level?: (label: string, number: number) => object;
    log?: (object: Record<string, unknown>) => Record<string, unknown>;
  };
}

/**
 * 模块日志器选项
 */
export interface ModuleLoggerOptions {
  module: string;
  context?: Record<string, unknown>;
  config?: Partial<LoggerConfig>;
}

/**
 * 日志器创建选项
 */
export interface LoggerOptions {
  name: string;
  pretty?: boolean;
  filePrefix?: string;
  config?: Partial<LoggerConfig>;
}

/**
 * 日志记录上下文
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * 抽象日志器接口 - 不暴露底层实现
 */
export interface ILogger {
  /** 调试级别日志 */
  debug(message: string, context?: LogContext): void;
  debug(context: LogContext, message?: string): void;

  /** 信息级别日志 */
  info(message: string, context?: LogContext): void;
  info(context: LogContext, message?: string): void;

  /** 警告级别日志 */
  warn(message: string, context?: LogContext): void;
  warn(context: LogContext, message?: string): void;

  /** 错误级别日志 */
  error(message: string, context?: LogContext): void;
  error(context: LogContext, message?: string): void;
  error(error: Error, message?: string, context?: LogContext): void;

  /** 致命错误级别日志 */
  fatal(message: string, context?: LogContext): void;
  fatal(context: LogContext, message?: string): void;
  fatal(error: Error, message?: string, context?: LogContext): void;

  /** 创建子日志器 */
  child(context: LogContext): ILogger;

  /** 检查日志级别是否启用 */
  isLevelEnabled(level: LogLevel): boolean;

  /** 获取日志器名称 */
  getName(): string;

  /** 获取日志器配置 */
  getConfig(): LoggerConfig;

  /** 刷新日志缓冲区 */
  flush(): Promise<void>;
}

/**
 * 日志器工厂接口
 */
export interface ILoggerFactory {
  /** 创建应用日志器 */
  createAppLogger(config?: Partial<LoggerConfig>): ILogger;

  /** 创建访问日志器 */
  createAccessLogger(config?: Partial<LoggerConfig>): ILogger;

  /** 创建模块日志器 */
  createModuleLogger(options: ModuleLoggerOptions): ILogger;

  /** 创建自定义日志器 */
  createLogger(options: LoggerOptions): ILogger;

  /** 获取默认应用日志器 */
  getAppLogger(): ILogger;

  /** 获取默认访问日志器 */
  getAccessLogger(): ILogger;
}

/**
 * 内部日志器包装接口
 */
export interface ILoggerWrapper extends ILogger {
  /** 获取底层pino实例 */
  getPinoInstance(): pino.Logger;

  /** 初始化日志器 */
  initialize(): Promise<void>;

  /** 销毁日志器 */
  destroy(): Promise<void>;
}

/**
 * 日志管理器接口
 */
export interface ILoggerManager {
  /** 注册日志器 */
  register(name: string, logger: ILoggerWrapper): Promise<void>;

  /** 获取日志器 */
  get(name: string): ILoggerWrapper | undefined;

  /** 检查日志器是否存在 */
  has(name: string): boolean;

  /** 获取所有已注册的日志器名称 */
  getRegisteredLoggers(): string[];

  /** 初始化管理器 */
  initialize(): Promise<void>;

  /** 关闭管理器 */
  shutdown(): Promise<void>;

  /** 检查是否已初始化 */
  get isInitialized(): boolean;
}

/**
 * 日志器类型枚举
 */
export enum LoggerType {
  APP = 'app',
  ACCESS = 'access',
  MODULE = 'module',
  CUSTOM = 'custom',
}

/**
 * 日志器创建参数
 */
export interface LoggerCreationParams {
  type: LoggerType;
  name: string;
  config?: Partial<LoggerConfig>;
  filePrefix?: string;
  pretty?: boolean;
  context?: LogContext;
}

/**
 * 内部使用的工厂函数类型
 */
export type InternalLoggerFactory = (params: LoggerCreationParams) => ILoggerWrapper;

/**
 * 日志器生命周期钩子
 */
export interface LoggerLifecycleHooks {
  onBeforeCreate?: (params: LoggerCreationParams) => void | Promise<void>;
  onAfterCreate?: (logger: ILoggerWrapper) => void | Promise<void>;
  onBeforeDestroy?: (logger: ILoggerWrapper) => void | Promise<void>;
  onAfterDestroy?: (name: string) => void | Promise<void>;
}

/**
 * 高级日志器配置
 */
export interface AdvancedLoggerConfig extends LoggerConfig {
  /** 生命周期钩子 */
  hooks?: LoggerLifecycleHooks;

  /** 是否启用缓存 */
  enableCache?: boolean;

  /** 自定义传输 */
  transport?: pino.TransportSingleOptions | pino.TransportMultiOptions;

  /** 自定义钩子 */
  customHooks?: {
    logMethod?: string;
  };
}
