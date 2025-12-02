# 重构后的日志系统模块文档

## 🔄 重构概述

这是一个重构后的基于 [Pino](https://getpino.io/) 的高性能日志系统，专为 Node.js 应用程序设计。本次重构的主要目标是**隐藏底层pino实例**，提供更好的封装性、扩展性和类型安全性。

## ✨ 重构亮点

- 🔒 **完全封装**: 隐藏pino实例，通过抽象接口提供日志功能
- 🏗️ **模块化架构**: 清晰的分层设计，易于维护和扩展
- 🎯 **类型安全**: 完整的TypeScript类型定义和接口抽象
- ⚡ **异步优先**: 支持异步初始化和生命周期管理
- 🔄 **向后兼容**: 保留原有API，平滑迁移
- 🎛️ **高级配置**: 增强的配置管理和预设支持
- 📊 **统一管理**: 集中的日志器生命周期管理

## 🏛️ 新架构设计

```
src/utils/log/
├── types.ts                  # 抽象接口和类型定义
├── config.ts                 # 增强的配置管理系统
├── LoggerWrapper.ts           # 日志器封装类
├── LoggerManager.ts           # 日志器生命周期管理
├── logger.ts                  # 主API入口
├── index.ts                   # 统一导出
├── README.md                  # 文档
└── test/                      # 测试目录
```

## 🆕 新功能特性

### 1. 抽象接口设计

```typescript
interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  fatal(message: string, context?: LogContext): void;
  child(context: LogContext): ILogger;
  isLevelEnabled(level: LogLevel): boolean;
  getName(): string;
  getConfig(): LoggerConfig;
  flush(): Promise<void>;
}
```

### 2. 生命周期管理

```typescript
// 初始化日志系统
await initializeLogSystem();

// 获取系统状态
const status = getLogSystemStatus();

// 优雅关闭
await shutdownLogSystem();
```

### 3. 增强的配置管理

```typescript
// 预设配置
import { ConfigPresets } from '@/utils/log';

const devConfig = ConfigPresets.development();
const prodConfig = ConfigPresets.production();

// 全局配置覆写
configManager.setGlobalOverrides({
  level: 'debug',
  prettyPrint: true,
});

// 特定日志器配置
configManager.setLoggerOverrides('user-service', {
  level: 'info',
});
```

## 🚀 快速开始

### 1. 新的API使用（推荐）

```typescript
import { createAppLogger, createModuleLogger } from '@/utils/log';

// 创建应用日志器
const appLogger = await createAppLogger();
appLogger.info('应用启动成功', { port: 3000 });

// 创建模块日志器
const userLogger = await createModuleLogger({
  module: 'user-service',
  context: { version: '1.0.0' },
});

userLogger.info('用户服务初始化完成');
```

### 2. 便利函数

```typescript
import { quickAppLogger, quickModuleLogger } from '@/utils/log';

// 快速创建调试级别的应用日志器
const debugLogger = await quickAppLogger('debug');

// 快速创建模块日志器
const moduleLogger = await quickModuleLogger('payment-service', 'info');
```

### 3. 默认日志器

```typescript
import logModule, { getDefaultLogger } from '@/utils/log';

// 获取默认日志器
const logger = await getDefaultLogger();

// 使用默认导出
const appLogger = await logModule.createAppLogger();
```

## 📝 详细使用指南

### 1. 应用日志记录

```typescript
import { createAppLogger } from '@/utils/log';

const logger = await createAppLogger({
  level: 'debug',
  prettyPrint: true,
});

// 支持多种调用方式
logger.info('服务器启动', { port: 3000 });
logger.info({ port: 3000 }, '服务器启动');

// 错误日志增强
logger.error(new Error('数据库连接失败'), '连接错误', {
  database: 'users',
  retryCount: 3,
});
```

### 2. 模块专用日志器

```typescript
import { createModuleLogger } from '@/utils/log';

class UserService {
  private logger = await createModuleLogger({
    module: 'user-service',
    context: {
      service: 'UserService',
      version: '2.0.0',
    },
  });

  async createUser(userData: UserData) {
    this.logger.info('开始创建用户', { email: userData.email });

    try {
      const user = await this.db.users.create(userData);
      this.logger.info('用户创建成功', {
        userId: user.id,
        email: user.email,
      });
      return user;
    } catch (error) {
      this.logger.error(error, '用户创建失败', {
        email: userData.email,
      });
      throw error;
    }
  }
}
```

### 3. 子日志器和上下文传递

```typescript
import { createAppLogger } from '@/utils/log';

const baseLogger = await createAppLogger();

// 为每个请求创建子日志器
app.use(async (req, res, next) => {
  const requestLogger = baseLogger.child({
    requestId: req.id,
    userId: req.user?.id,
    ip: req.ip,
  });

  req.logger = requestLogger;
  next();
});

// 在路由处理器中使用
app.get('/users', async (req, res) => {
  req.logger.info('获取用户列表请求');

  try {
    const users = await userService.getUsers();
    req.logger.info('用户列表获取成功', { count: users.length });
    res.json(users);
  } catch (error) {
    req.logger.error(error, '获取用户列表失败');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
```

### 4. 高级配置和管理

```typescript
import { loggerManager, configManager, ConfigPresets } from '@/utils/log';

// 应用不同环境的预设配置
if (process.env.NODE_ENV === 'production') {
  configManager.setGlobalOverrides(ConfigPresets.production());
} else {
  configManager.setGlobalOverrides(ConfigPresets.development());
}

// 创建自定义日志器
const customLogger = await loggerManager.createCustomLogger('analytics', {
  level: 'info',
  logToFile: true,
  fileConfig: {
    directory: 'analytics-logs',
    filePrefix: 'analytics',
    maxSize: '50m',
    maxFiles: 20,
  },
});

// 获取系统统计
const stats = loggerManager.getStats();
console.log('日志系统状态:', stats);
```

## 🔄 迁移指南

### 从旧API迁移到新API

```typescript
// 旧的API（仍然支持，但已弃用）
import { createAppLogger, createModuleLogger } from '@/utils/log';

const oldLogger = createAppLogger(); // 返回 pino.Logger
const oldModuleLogger = createModuleLogger({ module: 'test' }); // 返回 pino.Logger

// 新的API（推荐）
const newLogger = await createAppLogger(); // 返回 ILogger
const newModuleLogger = await createModuleLogger({ module: 'test' }); // 返回 ILogger

// 功能完全相同，但新API提供更好的封装
newLogger.info('测试消息', { data: 'value' });
```

### 向后兼容支持

```typescript
// 如果需要访问底层pino实例（不推荐）
import { LoggerWrapper } from '@/utils/log';

const wrapper = new LoggerWrapper('test', config);
const pinoInstance = wrapper.getPinoInstance(); // 仅用于特殊情况
```

## 🎛️ 配置参考

### 环境变量

```bash
# 基础配置
LOGGER_LEVEL=info
LOG_TO_FILE=true
LOG_FILE_MAX_SIZE=10m
LOG_FILE_MAX_FILES=5

# 开发环境
NODE_ENV=development
```

### 配置预设

```typescript
// 开发环境预设
const devConfig = ConfigPresets.development();
// { level: 'debug', prettyPrint: true, logToFile: false }

// 生产环境预设
const prodConfig = ConfigPresets.production();
// { level: 'info', prettyPrint: false, logToFile: true }

// 测试环境预设
const testConfig = ConfigPresets.test();
// { level: 'warn', prettyPrint: false, logToFile: false }

// 性能测试预设
const perfConfig = ConfigPresets.performance();
// { level: 'error', prettyPrint: false, serializers: {} }
```

## 🔍 调试和故障排除

### 1. 检查日志系统状态

```typescript
import { getLogSystemStatus } from '@/utils/log';

const status = getLogSystemStatus();
console.log('已注册日志器:', status.loggerNames);
console.log('总数:', status.totalLoggers);
console.log('是否已初始化:', status.isInitialized);
```

### 2. 手动初始化

```typescript
import { initializeLogSystem } from '@/utils/log';

// 在应用启动时手动初始化
await initializeLogSystem();
```

### 3. 优雅关闭

```typescript
import { shutdownLogSystem } from '@/utils/log';

// 在应用关闭时清理资源
process.on('SIGINT', async () => {
  await shutdownLogSystem();
  process.exit(0);
});
```

## 🧪 测试支持

```typescript
import { loggerManager } from '@/utils/log';

// 在测试中重置日志系统
beforeEach(async () => {
  await loggerManager.reset();
});

// 创建测试专用日志器
const testLogger = await createAppLogger(ConfigPresets.test());
```

## 📈 性能考虑

1. **日志器缓存**: 自动缓存已创建的日志器实例
2. **懒加载**: 延迟初始化日志系统
3. **异步操作**: 使用异步API避免阻塞
4. **配置预设**: 使用预设配置减少重复计算

## 🎯 最佳实践

1. **使用新的异步API**: `await createAppLogger()` 替代同步版本
2. **利用配置预设**: 使用 `ConfigPresets` 避免重复配置
3. **合理使用子日志器**: 为请求上下文创建子日志器
4. **统一错误处理**: 使用 `logger.error(error, message, context)` 格式
5. **生命周期管理**: 在应用启动和关闭时正确初始化和清理日志系统

## 🔮 未来规划

- [ ] 支持自定义传输（Transport）
- [ ] 集成分布式追踪
- [ ] 增加日志聚合功能
- [ ] 支持日志采样
- [ ] 提供Web界面管理工具

---

**重构完成！** 🎉 新的日志系统提供了更好的封装性、扩展性和类型安全性，同时保持了向后兼容性。
