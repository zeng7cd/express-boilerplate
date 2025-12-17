import pino from 'pino';

import { env } from '@/core/config/env';

/**
 * Pino日志配置模块
 * 根据环境变量创建pino配置，兼容原有的封装日志配置
 *
 * 日志级别颜色方案（仅控制台输出）：
 * - TRACE: 灰色 - 最详细的调试信息
 * - DEBUG: 灰色 - 调试信息
 * - INFO:  蓝色 - 普通信息
 * - WARN:  黄色 - 警告信息
 * - ERROR: 红色 - 错误信息
 * - FATAL: 红色 - 致命错误
 *
 * 注意：文件输出不包含颜色代码
 */

/**
 * 获取基础pino配置
 */
export function getBasePinoConfig(hasTransport = false): pino.LoggerOptions {
  const config: pino.LoggerOptions = {
    level: env.LOGGER_LEVEL,
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  };

  // 只有在没有使用 transport 时才添加自定义 formatters
  // 因为 transport.targets 不允许自定义 level formatters
  if (!hasTransport) {
    config.formatters = {
      level: (label: string) => ({
        level: label.toUpperCase(),
      }),
      log: (object: object) => ({
        ...object,
        timestamp: new Date().toISOString(),
      }),
    };
  }

  return config;
}

/**
 * 获取控制台输出的pino传输配置
 */
export function getConsoleTransport(): pino.TransportSingleOptions | null {
  if (!env.isDevelopment) {
    return null;
  }

  return {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
      singleLine: false,
      messageFormat: '{levelLabel} | {msg}',
      // 自定义颜色方案
      customColors: 'info:blue,warn:yellow,error:red,debug:gray,trace:gray',
      // 自定义日志级别颜色
      customLevels: {
        trace: 10,
        debug: 20,
        info: 30,
        warn: 40,
        error: 50,
        fatal: 60,
      },
    },
  };
}

/**
 * 获取文件输出的pino传输配置
 */
export function getFileTransport(filename = 'app.log'): pino.TransportSingleOptions {
  return {
    target: 'pino-pretty',
    options: {
      destination: `logs/${filename}`,
      mkdir: true,
      colorize: false,
      translateTime: 'yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
      singleLine: false,
    },
  };
}

/**
 * 创建多传输配置
 */
export function createMultiTransport(transports: pino.TransportSingleOptions[]): pino.TransportMultiOptions {
  return {
    targets: transports,
  };
}

/**
 * 根据环境配置创建传输配置
 */
export function getTransportConfig(
  logFileName?: string,
): pino.TransportSingleOptions | pino.TransportMultiOptions | undefined {
  const transports: pino.TransportSingleOptions[] = [];

  // 开发环境：控制台输出
  if (env.isDevelopment) {
    const consoleTransport = getConsoleTransport();
    if (consoleTransport) {
      transports.push(consoleTransport);
    }
  }

  // 生产环境或配置了文件输出：文件输出
  if (env.LOG_TO_FILE || env.isProduction) {
    transports.push(getFileTransport(logFileName));
  }

  // 没有传输配置时返回undefined（使用默认输出）
  if (transports.length === 0) {
    return undefined;
  }

  // 单个传输直接返回
  if (transports.length === 1) {
    return transports[0];
  }

  // 多个传输返回多传输配置
  return createMultiTransport(transports);
}

/**
 * 创建完整的pino配置
 */
export function createPinoConfig(name?: string, logFileName?: string): pino.LoggerOptions {
  const transport = getTransportConfig(logFileName);
  const baseConfig = getBasePinoConfig(!!transport);

  return {
    ...baseConfig,
    name,
    transport,
  };
}
