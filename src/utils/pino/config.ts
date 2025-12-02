import pino from 'pino';
import { env } from '@/config/envConfig';

/**
 * Pino日志配置模块
 * 根据环境变量创建pino配置，兼容原有的封装日志配置
 */

/**
 * 获取基础pino配置
 */
export function getBasePinoConfig(): pino.LoggerOptions {
  return {
    level: env.LOGGER_LEVEL,
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    formatters: {
      level: (label: string) => ({
        level: label.toUpperCase(),
      }),
      log: (object: object) => ({
        ...object,
        timestamp: new Date().toISOString(),
      }),
    },
  };
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
      messageFormat: '[{level}] {msg}',
    },
  };
}

/**
 * 获取文件输出的pino传输配置
 */
export function getFileTransport(filename = 'app.log'): pino.TransportSingleOptions {
  return {
    target: 'pino/file',
    options: {
      destination: `logs/${filename}`,
      mkdir: true,
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
  const baseConfig = getBasePinoConfig();
  const transport = getTransportConfig(logFileName);

  return {
    ...baseConfig,
    name,
    transport,
  };
}
