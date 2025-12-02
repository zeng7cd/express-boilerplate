/**
 * 日志器封装类
 * 隐藏pino实例，提供统一的抽象接口
 */

import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { configManager, createPinoConfig, getPrettyConfig } from './config';
import type { ILogger, ILoggerWrapper, LogContext, LoggerConfig, LogLevel } from './types';

/**
 * 日志器包装实现类
 */
export class LoggerWrapper implements ILogger, ILoggerWrapper {
  private _pinoInstance: pino.Logger;
  private _config: LoggerConfig;
  private _name: string;
  private _isInitialized: boolean = false;

  constructor(name: string, config: LoggerConfig) {
    this._name = name;
    this._config = { ...config };
    this._pinoInstance = this.createPinoInstance();
  }

  /**
   * 创建pino实例
   */
  private createPinoInstance(): pino.Logger {
    const pinoConfig = createPinoConfig(this._name, this._config);

    if (this._config.logToFile) {
      return this.createFileLogger(pinoConfig);
    }

    return this.createConsoleLogger(pinoConfig);
  }

  /**
   * 创建控制台日志器
   */
  private createConsoleLogger(pinoConfig: pino.LoggerOptions): pino.Logger {
    if (this._config.prettyPrint) {
      const prettyOptions = getPrettyConfig(this._config.isDevelopment);
      return pino(
        pinoConfig,
        pinoPretty({
          ...prettyOptions,
          destination: process.stdout,
        }),
      );
    }

    return pino(pinoConfig);
  }

  /**
   * 创建文件日志器
   */
  private createFileLogger(pinoConfig: pino.LoggerOptions): pino.Logger {
    this.ensureLogDirectory();

    const filename = this.getLogFileName();
    const filePath = path.join(this._config.fileConfig!.directory, filename);

    if (this._config.prettyPrint && this._config.isDevelopment) {
      // 开发环境：同时输出到控制台和文件
      const streams: pino.StreamEntry[] = [
        {
          stream: pinoPretty(getPrettyConfig(true)),
        },
        {
          stream: fs.createWriteStream(filePath, { flags: 'a' }),
        },
      ];
      return pino(pinoConfig, pino.multistream(streams));
    }

    // 生产环境：仅输出到文件
    const fileStream = fs.createWriteStream(filePath, { flags: 'a' });
    return pino(pinoConfig, fileStream);
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDirectory(): void {
    const logDir = this._config.fileConfig?.directory ?? 'logs';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * 获取日志文件名
   */
  private getLogFileName(): string {
    const prefix = this._config.fileConfig?.filePrefix ?? this._name;
    const date = new Date().toISOString().split('T')[0];
    return `${prefix}-${date}.log`;
  }

  // ========================
  // ILogger 接口实现
  // ========================

  /**
   * 调试级别日志
   */
  debug(messageOrContext: string | LogContext, contextOrMessage?: LogContext | string): void {
    this.logWithOverload('debug', messageOrContext, contextOrMessage);
  }

  /**
   * 信息级别日志
   */
  info(messageOrContext: string | LogContext, contextOrMessage?: LogContext | string): void {
    this.logWithOverload('info', messageOrContext, contextOrMessage);
  }

  /**
   * 警告级别日志
   */
  warn(messageOrContext: string | LogContext, contextOrMessage?: LogContext | string): void {
    this.logWithOverload('warn', messageOrContext, contextOrMessage);
  }

  /**
   * 错误级别日志
   */
  error(
    errorOrMessageOrContext: Error | string | LogContext,
    messageOrContext?: string | LogContext,
    context?: LogContext,
  ): void {
    if (errorOrMessageOrContext instanceof Error) {
      // error(error, message?, context?)
      const error = errorOrMessageOrContext;
      const message = typeof messageOrContext === 'string' ? messageOrContext : error.message;
      const ctx = typeof messageOrContext === 'object' ? messageOrContext : context || {};

      this._pinoInstance.error(
        {
          err: error,
          ...ctx,
        },
        message,
      );
    } else {
      // error(message, context?) 或 error(context, message?)
      this.logWithOverload('error', errorOrMessageOrContext, messageOrContext);
    }
  }

  /**
   * 致命错误级别日志
   */
  fatal(
    errorOrMessageOrContext: Error | string | LogContext,
    messageOrContext?: string | LogContext,
    context?: LogContext,
  ): void {
    if (errorOrMessageOrContext instanceof Error) {
      // fatal(error, message?, context?)
      const error = errorOrMessageOrContext;
      const message = typeof messageOrContext === 'string' ? messageOrContext : error.message;
      const ctx = typeof messageOrContext === 'object' ? messageOrContext : context || {};

      this._pinoInstance.fatal(
        {
          err: error,
          ...ctx,
        },
        message,
      );
    } else {
      // fatal(message, context?) 或 fatal(context, message?)
      this.logWithOverload('fatal', errorOrMessageOrContext, messageOrContext);
    }
  }

  /**
   * 处理重载方法的通用逻辑
   */
  private logWithOverload(
    level: LogLevel,
    messageOrContext: string | LogContext,
    contextOrMessage?: LogContext | string,
  ): void {
    if (typeof messageOrContext === 'string') {
      // 第一个参数是消息
      const message = messageOrContext;
      const context = (typeof contextOrMessage === 'object' ? contextOrMessage : {}) as LogContext;
      this._pinoInstance[level](context, message);
    } else {
      // 第一个参数是上下文
      const context = messageOrContext as LogContext;
      const message = typeof contextOrMessage === 'string' ? contextOrMessage : '';
      this._pinoInstance[level](context, message);
    }
  }

  /**
   * 创建子日志器
   */
  child(context: LogContext): ILogger {
    const childPinoLogger = this._pinoInstance.child(context);
    const childWrapper = new LoggerWrapper(this._name, this._config);
    childWrapper._pinoInstance = childPinoLogger;
    childWrapper._isInitialized = this._isInitialized;
    return childWrapper;
  }

  /**
   * 检查日志级别是否启用
   */
  isLevelEnabled(level: LogLevel): boolean {
    return this._pinoInstance.isLevelEnabled(level);
  }

  /**
   * 获取日志器名称
   */
  getName(): string {
    return this._name;
  }

  /**
   * 获取日志器配置
   */
  getConfig(): LoggerConfig {
    return { ...this._config };
  }

  /**
   * 刷新日志缓冲区
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this._pinoInstance.flush(() => {
        resolve();
      });
    });
  }

  // ========================
  // ILoggerWrapper 接口实现
  // ========================

  /**
   * 获取底层pino实例（仅供内部使用）
   */
  getPinoInstance(): pino.Logger {
    return this._pinoInstance;
  }

  /**
   * 初始化日志器
   */
  async initialize(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    // 执行初始化逻辑
    if (this._config.logToFile) {
      this.ensureLogDirectory();
    }

    this._isInitialized = true;
    this.info(`Logger "${this._name}" initialized`, {
      level: this._config.level,
      logToFile: this._config.logToFile,
      prettyPrint: this._config.prettyPrint,
    });
  }

  /**
   * 销毁日志器
   */
  async destroy(): Promise<void> {
    if (!this._isInitialized) {
      return;
    }

    await this.flush();
    this._isInitialized = false;

    // 清理资源
    // pino实例会在进程结束时自动清理
  }
}

/**
 * 日志器工厂函数
 */
export function createLoggerWrapper(name: string, config?: Partial<LoggerConfig>): LoggerWrapper {
  const finalConfig = configManager.getConfig(name, config);
  return new LoggerWrapper(name, finalConfig);
}

/**
 * 创建应用日志器包装
 */
export function createAppLoggerWrapper(config?: Partial<LoggerConfig>): LoggerWrapper {
  return createLoggerWrapper('app', config);
}

/**
 * 创建访问日志器包装
 */
export function createAccessLoggerWrapper(config?: Partial<LoggerConfig>): LoggerWrapper {
  const accessConfig = {
    prettyPrint: false,
    fileConfig: {
      maxSize: '10m',
      maxFiles: 5,
      directory: 'logs',
      filePrefix: 'access',
    },
    ...config,
  };
  return createLoggerWrapper('access', accessConfig);
}

/**
 * 创建模块日志器包装
 */
export function createModuleLoggerWrapper(moduleName: string, config?: Partial<LoggerConfig>): LoggerWrapper {
  return createLoggerWrapper(`module-${moduleName}`, config);
}
