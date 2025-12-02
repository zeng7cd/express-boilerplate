/**
 * 重构后的日志模块入口
 * 提供新的封装API和向后兼容接口
 */

// 导入类型
import type {
	AdvancedLoggerConfig,
	FileLogConfig,
	ILogger,
	ILoggerFactory,
	ILoggerManager,
	LogContext,
	LoggerConfig,
	LoggerOptions,
	LoggerType,
	LogLevel,
	ModuleLoggerOptions,
} from "./types";

// ========================================
// 新的主要API导出（推荐使用）
// ========================================

// 配置管理API
export {
	ConfigPresets,
	configManager,
	createConfigForType,
	createPinoConfig,
	getLoggerConfig,
	getPrettyConfig,
} from "./config";
// 异步日志器创建API（新的封装接口）
export {
	createAccessLogger,
	createAppLogger,
	createModuleLogger,
	createModuleLoggerInstance,
	getAccessLogger,
	getAppLogger,
	initializeLogSystem,
	loggerFactory,
	loggerManager,
} from "./logger";

// 核心类型导出
export type {
	ILogger,
	ILoggerFactory,
	ILoggerManager,
	LoggerConfig,
	ModuleLoggerOptions,
	LogContext,
	LogLevel,
	FileLogConfig,
	LoggerOptions,
	LoggerType,
	AdvancedLoggerConfig,
};

// ========================================
// 向后兼容的API（已弃用但保留）
// ========================================

// 传统配置导出（向后兼容）
export { prettyConfig } from "./config";
// 同步API（已弃用）
export {
	createAccessLoggerSync,
	createAppLoggerSync,
	createModuleLoggerInstanceSync,
	createModuleLoggerLegacy,
} from "./logger";

// ========================================
// 高级用法导出
// ========================================

// 管理器类（用于自定义管理）
export { LoggerManager } from "./LoggerManager";
// 日志器包装类（用于扩展）
export { LoggerWrapper } from "./LoggerWrapper";

// ========================================
// 便利函数
// ========================================

/**
 * 快速创建应用日志器的便利函数
 */
export async function quickAppLogger(level?: LogLevel): Promise<ILogger> {
	const { createAppLogger } = await import("./logger");
	return createAppLogger(level ? { level } : undefined);
}

/**
 * 快速创建模块日志器的便利函数
 */
export async function quickModuleLogger(moduleName: string, level?: LogLevel): Promise<ILogger> {
	const { createModuleLogger } = await import("./logger");
	return createModuleLogger({
		module: moduleName,
		config: level ? { level } : undefined,
	});
}

/**
 * 获取日志系统状态
 */
export function getLogSystemStatus() {
	const { loggerManager } = require("./logger");
	return loggerManager.getStats();
}

/**
 * 关闭日志系统
 */
export async function shutdownLogSystem(): Promise<void> {
	const { loggerManager } = await import("./logger");
	await loggerManager.shutdown();
}

// ========================================
// 默认导出（用于简单使用场景）
// ========================================

/**
 * 默认日志器实例（懒加载）
 */
let defaultLogger: ILogger | null = null;

/**
 * 获取默认日志器实例
 */
export async function getDefaultLogger(): Promise<ILogger> {
	if (!defaultLogger) {
		const { createAppLogger } = await import("./logger");
		defaultLogger = await createAppLogger();
	}
	return defaultLogger;
}

/**
 * 默认导出对象
 */
export default {
	// 主要API
	async createAppLogger(config?: Partial<LoggerConfig>) {
		const { createAppLogger } = await import("./logger");
		return createAppLogger(config);
	},
	async createAccessLogger(config?: Partial<LoggerConfig>) {
		const { createAccessLogger } = await import("./logger");
		return createAccessLogger(config);
	},
	async createModuleLogger(options: ModuleLoggerOptions) {
		const { createModuleLogger } = await import("./logger");
		return createModuleLogger(options);
	},
	getDefaultLogger,
	quickAppLogger,
	quickModuleLogger,

	// 管理API
	async initializeLogSystem() {
		const { initializeLogSystem } = await import("./logger");
		return initializeLogSystem();
	},
	shutdownLogSystem,
	getLogSystemStatus,

	// 配置API
	get configManager() {
		const { configManager } = require("./config");
		return configManager;
	},
	get ConfigPresets() {
		const { ConfigPresets } = require("./config");
		return ConfigPresets;
	},

	// 高级API
	get loggerManager() {
		const { loggerManager } = require("./logger");
		return loggerManager;
	},
	get loggerFactory() {
		const { loggerFactory } = require("./logger");
		return loggerFactory;
	},
};
