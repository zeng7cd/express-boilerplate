/**
 * 统一日志系统入口
 */
export type { ILogger, LogMeta, LoggerConfig } from './types';
export { UnifiedLogger, getLogger, createLogger } from './logger';
