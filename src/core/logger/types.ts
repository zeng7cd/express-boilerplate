/**
 * 统一日志系统类型定义
 */

export interface LogMeta {
  userId?: string;
  requestId?: string;
  module?: string;
  action?: string;
  [key: string]: unknown;
}

export interface ILogger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, error?: Error, meta?: LogMeta): void;
  child(bindings: Record<string, unknown>): ILogger;
}

export interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  pretty?: boolean;
  service?: string;
}
