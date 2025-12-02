import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
	AccessLogger,
	AppLogger,
	createModuleLogger,
	getAccessLogger,
	getAppLogger,
	initializeAccessLogger,
	initializeLogger,
	LoggerManager,
	logger,
	loggerManager,
} from "../logger";
import type { ModuleLoggerOptions } from "../types";

describe("Logger Class-based Implementation", () => {
	beforeEach(() => {
		// 清理日志管理器状态
		loggerManager.shutdown();
	});

	afterEach(async () => {
		await loggerManager.shutdown();
	});

	describe("BaseLogger Classes", () => {
		test("should create AppLogger instance", () => {
			const appLogger = new AppLogger();
			expect(appLogger.name).toBe("app");
			expect(appLogger.config).toBeDefined();
		});

		test("should create AccessLogger instance", () => {
			const accessLogger = new AccessLogger();
			expect(accessLogger.name).toBe("access");
			expect(accessLogger.config).toBeDefined();
		});

		test("should initialize logger asynchronously", async () => {
			const appLogger = new AppLogger();
			await appLogger.initialize();
			const pinoLogger = appLogger.getLogger();
			expect(pinoLogger).toBeDefined();
			expect(typeof pinoLogger.info).toBe("function");
		});

		test("should throw error when getting uninitialized logger", () => {
			const appLogger = new AppLogger();
			expect(() => appLogger.getLogger()).toThrow("Logger 'app' not initialized");
		});

		test("should create child logger", async () => {
			const appLogger = new AppLogger();
			await appLogger.initialize();
			const childLogger = appLogger.createChild({ module: "test" });
			expect(childLogger).toBeDefined();
		});
	});

	describe("LoggerManager", () => {
		test("should create new LoggerManager instance", () => {
			const manager = new LoggerManager();
			expect(manager).toBeDefined();
		});

		test("should initialize with default loggers", async () => {
			const manager = new LoggerManager();
			await manager.initialize();

			expect(manager.has("app")).toBe(true);
			expect(manager.has("access")).toBe(true);
		});

		test("should register and get loggers", async () => {
			const manager = new LoggerManager();
			const customLogger = new AppLogger();

			await manager.register("custom", customLogger);
			const retrieved = manager.get("custom");

			expect(retrieved).toBe(customLogger);
		});

		test("should throw error for duplicate registration", async () => {
			const manager = new LoggerManager();
			const logger1 = new AppLogger();
			const logger2 = new AppLogger();

			await manager.register("test", logger1);
			await expect(manager.register("test", logger2)).rejects.toThrow("already registered");
		});

		test("should throw error for non-existent logger", () => {
			const manager = new LoggerManager();
			expect(() => manager.get("nonexistent")).toThrow("not found");
		});

		test("should create module logger", async () => {
			const manager = new LoggerManager();
			await manager.initialize();

			const moduleLogger = manager.createModuleLogger({
				module: "test-module",
				context: { userId: "123" },
			});

			expect(moduleLogger).toBeDefined();
		});

		test("should shutdown all loggers", async () => {
			const manager = new LoggerManager();
			await manager.initialize();

			expect(manager.has("app")).toBe(true);
			expect(manager.has("access")).toBe(true);

			await manager.shutdown();

			expect(manager.has("app")).toBe(false);
			expect(manager.has("access")).toBe(false);
		});
	});

	describe("Backward Compatibility API", () => {
		test("should get app logger via function", () => {
			const pinoLogger = getAppLogger();
			expect(pinoLogger).toBeDefined();
			expect(typeof pinoLogger.info).toBe("function");
		});

		test("should get access logger via function", () => {
			const pinoLogger = getAccessLogger();
			expect(pinoLogger).toBeDefined();
			expect(typeof pinoLogger.info).toBe("function");
		});

		test("should initialize loggers via functions", async () => {
			await initializeLogger();
			await initializeAccessLogger();

			expect(loggerManager.has("app")).toBe(true);
			expect(loggerManager.has("access")).toBe(true);
		});

		test("should create module logger via function", () => {
			// 确保app logger已初始化
			getAppLogger();

			const options: ModuleLoggerOptions = {
				module: "test-module",
				context: { requestId: "req-123" },
			};

			const moduleLogger = createModuleLogger(options);
			expect(moduleLogger).toBeDefined();
		});

		test("should use default logger object", () => {
			expect(logger.debug).toBeDefined();
			expect(logger.info).toBeDefined();
			expect(logger.warn).toBeDefined();
			expect(logger.error).toBeDefined();
			expect(logger.child).toBeDefined();

			// Test methods don't throw
			expect(() => logger.info("test message")).not.toThrow();
			expect(() => logger.debug("test debug", { meta: "data" })).not.toThrow();
		});

		test("should create child logger from default logger", () => {
			const childLogger = logger.child({ component: "test" });
			expect(childLogger).toBeDefined();
			expect(typeof childLogger.info).toBe("function");
		});
	});

	describe("Configuration", () => {
		test("should accept custom config in AppLogger", () => {
			const customConfig = {
				level: "warn" as const,
				logToFile: false,
			};

			const appLogger = new AppLogger(customConfig);
			expect(appLogger.config.level).toBe("warn");
			expect(appLogger.config.logToFile).toBe(false);
		});

		test("should accept custom config in AccessLogger", () => {
			const customConfig = {
				level: "error" as const,
				prettyPrint: false,
			};

			const accessLogger = new AccessLogger(customConfig);
			expect(accessLogger.config.level).toBe("error");
			expect(accessLogger.config.prettyPrint).toBe(false);
		});
	});

	describe("Error Handling", () => {
		test("should handle logger creation errors gracefully", () => {
			// Test that logger creation doesn't throw even with edge cases
			expect(() => new AppLogger()).not.toThrow();
			expect(() => new AccessLogger()).not.toThrow();
		});

		test("should handle multiple initializations", async () => {
			const appLogger = new AppLogger();
			await appLogger.initialize();

			// Second initialization should not throw
			await expect(appLogger.initialize()).resolves.not.toThrow();
		});
	});
});
