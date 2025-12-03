/**
 * Pino日志模块统一导出
 * 提供简单、直接的pino日志功能，替代原有的封装日志系统
 */

// 重新导出pino类型供外部使用
export type { Logger as PinoLogger } from 'pino';
// 导出配置函数
export {
  createMultiTransport,
  createPinoConfig,
  getBasePinoConfig,
  getConsoleTransport,
  getFileTransport,
  getTransportConfig,
} from './config';
// 导出工厂函数
export {
  createAccessPinoLogger,
  createAppPinoLogger,
  createCustomPinoLogger,
  createModulePinoLogger,
  getAccessPinoLogger,
  getAppPinoLogger,
  resetPinoLoggers,
} from './factory';
