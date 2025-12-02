import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createModuleLogger, getAccessLogger, getAppLogger, initializeLogSystem, loggerManager } from '../logger';
import type { ModuleLoggerOptions } from '../types';

describe('Logger System Integration', () => {
  beforeEach(async () => {
    // 重置日志管理器状态
    await loggerManager.reset();
  });

  afterEach(async () => {
    await loggerManager.shutdown();
  });

  describe('Logger Manager', () => {
    test('should initialize logger manager', async () => {
      await loggerManager.initialize();
      expect(loggerManager.isInitialized).toBe(true);
    });

    test('should get app logger after initialization', async () => {
      await loggerManager.initialize();
      const appLogger = loggerManager.getAppLogger();
      expect(appLogger).toBeDefined();
      expect(typeof appLogger.info).toBe('function');
    });

    test('should get access logger after initialization', async () => {
      await loggerManager.initialize();
      const accessLogger = loggerManager.getAccessLogger();
      expect(accessLogger).toBeDefined();
      expect(typeof accessLogger.info).toBe('function');
    });

    test('should create child logger', async () => {
      await loggerManager.initialize();
      const appLogger = loggerManager.getAppLogger();
      const childLogger = appLogger.child({ module: 'test' });
      expect(childLogger).toBeDefined();
    });

    test('should initialize with default loggers', async () => {
      await loggerManager.initialize();

      expect(loggerManager.has('app')).toBe(true);
      expect(loggerManager.has('access')).toBe(true);
    });

    test('should create custom logger', async () => {
      await loggerManager.initialize();
      const customLogger = await loggerManager.createCustomLogger('custom');
      expect(customLogger).toBeDefined();
      expect(loggerManager.has('custom')).toBe(true);
    });

    test('should return existing custom logger', async () => {
      await loggerManager.initialize();
      const logger1 = await loggerManager.createCustomLogger('test');
      const logger2 = await loggerManager.createCustomLogger('test');
      expect(logger1).toBe(logger2);
    });

    test('should throw error for non-existent logger', async () => {
      await loggerManager.initialize();
      expect(() => loggerManager.get('nonexistent')).not.toThrow();
      expect(loggerManager.get('nonexistent')).toBeUndefined();
    });

    test('should create module logger', async () => {
      await loggerManager.initialize();

      const moduleLogger = loggerManager.createModuleLogger({
        module: 'test-module',
        context: { userId: '123' },
      });

      expect(moduleLogger).toBeDefined();
    });

    test('should shutdown all loggers', async () => {
      await loggerManager.initialize();

      expect(loggerManager.has('app')).toBe(true);
      expect(loggerManager.has('access')).toBe(true);

      await loggerManager.shutdown();

      expect(loggerManager.has('app')).toBe(false);
      expect(loggerManager.has('access')).toBe(false);
    });

    test('should get logger statistics', async () => {
      await loggerManager.initialize();
      const stats = loggerManager.getStats();

      expect(stats.totalLoggers).toBeGreaterThan(0);
      expect(stats.loggerNames).toContain('app');
      expect(stats.loggerNames).toContain('access');
      expect(stats.isInitialized).toBe(true);
    });
  });

  describe('Backward Compatibility API', () => {
    test('should get app logger via function', async () => {
      await initializeLogSystem();
      const pinoLogger = getAppLogger();
      expect(pinoLogger).toBeDefined();
      expect(typeof pinoLogger.info).toBe('function');
    });

    test('should get access logger via function', async () => {
      await initializeLogSystem();
      const pinoLogger = getAccessLogger();
      expect(pinoLogger).toBeDefined();
      expect(typeof pinoLogger.info).toBe('function');
    });

    test('should initialize loggers via functions', async () => {
      await initializeLogSystem();

      expect(loggerManager.has('app')).toBe(true);
      expect(loggerManager.has('access')).toBe(true);
    });

    test('should create module logger via function', async () => {
      await initializeLogSystem();

      const options: ModuleLoggerOptions = {
        module: 'test-module',
        context: { requestId: 'req-123' },
      };

      const moduleLogger = await createModuleLogger(options);
      expect(moduleLogger).toBeDefined();
    });

    test('should use app logger', async () => {
      await initializeLogSystem();
      const appLogger = getAppLogger();

      expect(appLogger.debug).toBeDefined();
      expect(appLogger.info).toBeDefined();
      expect(appLogger.warn).toBeDefined();
      expect(appLogger.error).toBeDefined();
      expect(appLogger.child).toBeDefined();

      // Test methods don't throw
      expect(() => appLogger.info('test message')).not.toThrow();
      expect(() => appLogger.debug('test debug', { meta: 'data' })).not.toThrow();
    });

    test('should create child logger from app logger', async () => {
      await initializeLogSystem();
      const appLogger = getAppLogger();
      const childLogger = appLogger.child({ component: 'test' });
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });
  });

  describe('Configuration', () => {
    test('should create custom logger with config', async () => {
      await loggerManager.initialize();
      const customLogger = await loggerManager.createCustomLogger('custom', {
        level: 'warn',
        logToFile: false,
      });

      expect(customLogger).toBeDefined();
      expect(typeof customLogger.warn).toBe('function');
    });

    test('should create module logger instance with config', async () => {
      await loggerManager.initialize();

      const moduleLogger = await loggerManager.getOrCreateModuleLogger('test-module', {
        level: 'debug',
      });

      expect(moduleLogger).toBeDefined();
      expect(typeof moduleLogger.debug).toBe('function');
    });
  });

  describe('Error Handling', () => {
    test('should handle logger manager operations gracefully', async () => {
      // Test that logger manager operations don't throw
      expect(() => loggerManager.getStats()).not.toThrow();
      expect(() => loggerManager.getRegisteredLoggers()).not.toThrow();
    });

    test('should handle multiple initializations', async () => {
      await loggerManager.initialize();

      // Second initialization should not throw
      await expect(loggerManager.initialize()).resolves.not.toThrow();
    });

    test('should handle getting loggers before initialization', () => {
      expect(() => getAppLogger()).toThrow();
      expect(() => getAccessLogger()).toThrow();
    });

    test('should handle shutdown when not initialized', async () => {
      // Should not throw even if not initialized
      await expect(loggerManager.shutdown()).resolves.not.toThrow();
    });
  });
});
