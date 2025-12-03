/**
 * 统一日志系统实现
 */
import pino from 'pino';
import type { ILogger, LogMeta, LoggerConfig } from './types';
import { env } from '@/core/config/env';

export class UnifiedLogger implements ILogger {
  private pinoLogger: pino.Logger;
  private readonly config: LoggerConfig;

  constructor(config: LoggerConfig, pinoInstance?: pino.Logger) {
    this.config = config;
    if (pinoInstance) {
      this.pinoLogger = pinoInstance;
    } else {
      this.pinoLogger = pino({
        level: config.level,
        formatters: {
          level: (label) => ({ level: label }),
          log: (object) => ({
            ...object,
            timestamp: new Date().toISOString(),
            service: config.service || 'user-management-api',
          }),
        },
        transport: config.pretty
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
      });
    }
  }

  debug(message: string, meta?: LogMeta): void {
    this.pinoLogger.debug(meta, message);
  }

  info(message: string, meta?: LogMeta): void {
    this.pinoLogger.info(meta, message);
  }

  warn(message: string, meta?: LogMeta): void {
    this.pinoLogger.warn(meta, message);
  }

  error(message: string, error?: Error, meta?: LogMeta): void {
    this.pinoLogger.error({ err: error, ...meta }, message);
  }

  child(bindings: Record<string, unknown>): ILogger {
    const childPinoLogger = this.pinoLogger.child(bindings);
    return new UnifiedLogger(this.config, childPinoLogger);
  }
}

// 全局日志实例
let globalLogger: ILogger | null = null;

export function getLogger(): ILogger {
  if (!globalLogger) {
    globalLogger = new UnifiedLogger({
      level: env.LOGGER_LEVEL,
      pretty: env.isDevelopment,
      service: 'user-management-api',
    });
  }
  return globalLogger;
}

export function createLogger(config?: Partial<LoggerConfig>): ILogger {
  return new UnifiedLogger({
    level: config?.level || env.LOGGER_LEVEL,
    pretty: config?.pretty ?? env.isDevelopment,
    service: config?.service || 'user-management-api',
  });
}
