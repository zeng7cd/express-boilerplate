import pino from "pino";
import { env } from "../../config/envConfig";
import type { AdvancedLoggerConfig, FileLogConfig, LoggerConfig, LoggerCreationParams, LogLevel } from "./types";
import { LoggerType } from "./types";

/**
 * 配置管理器类
 */
class ConfigManager {
	private static instance: ConfigManager;
	private _defaultConfig: LoggerConfig;
	private _configOverrides = new Map<string, Partial<LoggerConfig>>();

	private constructor() {
		this._defaultConfig = this.createDefaultConfig();
	}

	public static getInstance(): ConfigManager {
		if (!ConfigManager.instance) {
			ConfigManager.instance = new ConfigManager();
		}
		return ConfigManager.instance;
	}

	/**
	 * 创建默认配置
	 */
	private createDefaultConfig(): LoggerConfig {
		return {
			level: (env.LOGGER_LEVEL as LogLevel) || "info",
			isDevelopment: env.isDevelopment || false,
			logToFile: env.LOG_TO_FILE || false,
			prettyPrint: env.isDevelopment || false,
			fileConfig: {
				maxSize: env.LOG_FILE_MAX_SIZE || "10m",
				maxFiles: env.LOG_FILE_MAX_FILES || 5,
				directory: "logs",
			},
			serializers: {
				err: pino.stdSerializers.err,
				req: pino.stdSerializers.req,
				res: pino.stdSerializers.res,
			},
			formatters: {
				level: (label: string, number: number) => ({
					level: label.toUpperCase(),
					// levelValue: number,
				}),
				log: (object: object) => ({
					...(object as Record<string, unknown>),
					timestamp: new Date().toISOString(),
				}),
			},
		};
	}

	/**
	 * 获取默认配置
	 */
	public getDefaultConfig(): LoggerConfig {
		return { ...this._defaultConfig };
	}

	/**
	 * 设置全局配置覆写
	 */
	public setGlobalOverrides(overrides: Partial<LoggerConfig>): void {
		this._configOverrides.set("global", overrides);
	}

	/**
	 * 设置特定日志器的配置覆写
	 */
	public setLoggerOverrides(loggerName: string, overrides: Partial<LoggerConfig>): void {
		this._configOverrides.set(loggerName, overrides);
	}

	/**
	 * 获取合并后的配置
	 */
	public getConfig(loggerName?: string, overrides?: Partial<LoggerConfig>): LoggerConfig {
		let config = { ...this._defaultConfig };

		// 应用全局覆写
		const globalOverrides = this._configOverrides.get("global");
		if (globalOverrides) {
			config = this.mergeConfigs(config, globalOverrides);
		}

		// 应用特定日志器覆写
		if (loggerName) {
			const loggerOverrides = this._configOverrides.get(loggerName);
			if (loggerOverrides) {
				config = this.mergeConfigs(config, loggerOverrides);
			}
		}

		// 应用临时覆写
		if (overrides) {
			config = this.mergeConfigs(config, overrides);
		}

		return this.validateConfig(config);
	}

	/**
	 * 深度合并配置
	 */
	private mergeConfigs(base: LoggerConfig, overrides: Partial<LoggerConfig>): LoggerConfig {
		const merged = { ...base, ...overrides };

		// 特殊处理嵌套对象
		if (overrides.fileConfig) {
			merged.fileConfig = {
				...base.fileConfig,
				...overrides.fileConfig,
			} as FileLogConfig;
		}

		if (overrides.serializers) {
			merged.serializers = {
				...base.serializers,
				...overrides.serializers,
			};
		}

		if (overrides.formatters) {
			merged.formatters = {
				...base.formatters,
				...overrides.formatters,
			};
		}

		return merged;
	}

	/**
	 * 验证配置
	 */
	private validateConfig(config: LoggerConfig): LoggerConfig {
		// 验证日志级别
		const validLevels: LogLevel[] = ["debug", "info", "warn", "error", "fatal"];
		if (!validLevels.includes(config.level)) {
			console.warn(`Invalid log level: ${config.level}, using 'info'`);
			config.level = "info";
		}

		// 验证文件配置
		if (config.logToFile && config.fileConfig) {
			if (!config.fileConfig.directory) {
				config.fileConfig.directory = "logs";
			}
			if (!config.fileConfig.maxSize) {
				config.fileConfig.maxSize = "10m";
			}
			if (!config.fileConfig.maxFiles || config.fileConfig.maxFiles < 1) {
				config.fileConfig.maxFiles = 5;
			}
		}

		return config;
	}

	/**
	 * 重置配置
	 */
	public reset(): void {
		this._configOverrides.clear();
		this._defaultConfig = this.createDefaultConfig();
	}

	/**
	 * 获取环境特定的配置
	 */
	public getEnvironmentConfig(): Partial<LoggerConfig> {
		if (env.isDevelopment) {
			return {
				level: "debug",
				prettyPrint: true,
				logToFile: false,
			};
		}

		return {
			level: "info",
			prettyPrint: false,
			logToFile: true,
		};
	}
}

// 配置管理器实例
export const configManager = ConfigManager.getInstance();

/**
 * 获取合并后的日志配置（向后兼容）
 */
export const getLoggerConfig = (overrides?: Partial<LoggerConfig>): LoggerConfig => {
	return configManager.getConfig(undefined, overrides);
};

/**
 * 创建Pino基础配置
 */
export const createPinoConfig = (name: string, config: LoggerConfig): pino.LoggerOptions => {
	const baseConfig: pino.LoggerOptions = {
		name,
		level: config.level,
		serializers: config.serializers,
		formatters: config.formatters as any,
	};

	// 添加自定义传输
	if (config.logToFile && config.fileConfig) {
		// 这里可以添加文件传输配置
	}

	return baseConfig;
};

/**
 * 创建基于日志器类型的配置
 */
export const createConfigForType = (
	type: LoggerType,
	name: string,
	overrides?: Partial<LoggerConfig>,
): LoggerConfig => {
	let baseOverrides: Partial<LoggerConfig> = {};

	switch (type) {
		case LoggerType.ACCESS:
			baseOverrides = {
				prettyPrint: false, // 访问日志通常不需要美化
				fileConfig: {
					maxSize: "10m",
					maxFiles: 5,
					directory: "logs",
					filePrefix: "access",
				},
			};
			break;

		case LoggerType.MODULE:
			baseOverrides = {
				prettyPrint: true, // 模块日志需要美化以便调试
			};
			break;

		case LoggerType.APP:
			baseOverrides = {
				fileConfig: {
					maxSize: "10m",
					maxFiles: 5,
					directory: "logs",
					filePrefix: "application",
				},
			};
			break;

		case LoggerType.CUSTOM:
		default:
			// 使用默认配置
			break;
	}

	return configManager.getConfig(name, {
		...baseOverrides,
		...overrides,
	});
};

/**
 * 开发环境美化配置
 */
export const getPrettyConfig = (isDevelopment: boolean = true) => {
	if (!isDevelopment) {
		return undefined;
	}

	return {
		colorize: true,
		translateTime: "yyyy-mm-dd HH:MM:ss.l",
		ignore: "pid,hostname",
		singleLine: false,
		messageFormat: "[{level}] {msg}",
	};
};

/**
 * 创建高级配置
 */
export const createAdvancedConfig = (
	base: LoggerConfig,
	advanced: Partial<AdvancedLoggerConfig>,
): AdvancedLoggerConfig => {
	return {
		...base,
		...advanced,
		enableCache: advanced.enableCache ?? true,
	};
};

/**
 * 配置预设
 */
export const ConfigPresets = {
	/**
	 * 开发环境预设
	 */
	development: (): Partial<LoggerConfig> => ({
		level: "debug",
		isDevelopment: true,
		prettyPrint: true,
		logToFile: false,
	}),

	/**
	 * 生产环境预设
	 */
	production: (): Partial<LoggerConfig> => ({
		level: "info",
		isDevelopment: false,
		prettyPrint: false,
		logToFile: true,
		fileConfig: {
			maxSize: "50m",
			maxFiles: 10,
			directory: "logs",
		},
	}),

	/**
	 * 测试环境预设
	 */
	test: (): Partial<LoggerConfig> => ({
		level: "warn",
		isDevelopment: false,
		prettyPrint: false,
		logToFile: false,
	}),

	/**
	 * 性能测试预设
	 */
	performance: (): Partial<LoggerConfig> => ({
		level: "error",
		isDevelopment: false,
		prettyPrint: false,
		logToFile: true,
		serializers: {}, // 最小序列化
	}),
};

// 导出配置管理器单例
export { ConfigManager };

// 向后兼容的导出
export const prettyConfig = getPrettyConfig();
