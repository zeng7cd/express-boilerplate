# Pino日志系统使用指南

## 📖 概述

本项目已从封装的日志系统迁移到直接使用Pino日志库。这个新的日志系统提供了更简单、更直接的日志记录方式，同时保持了与现有环境变量配置的兼容性。

## 🚀 快速开始

### 1. 基础用法

```typescript
import { createAppPinoLogger, createModulePinoLogger } from '@/utils/pino';

// 创建应用主日志器
const appLogger = createAppPinoLogger();
appLogger.info('应用启动成功');

// 创建模块日志器
const moduleLogger = createModulePinoLogger('user-service');
moduleLogger.info({ userId: 123 }, '用户登录成功');
```

### 2. 在服务类中使用

```typescript
import { createModulePinoLogger, type PinoLogger } from '@/utils/pino';

class UserService {
  private logger: PinoLogger;

  constructor() {
    this.logger = createModulePinoLogger('user-service');
  }

  async createUser(userData: any) {
    try {
      this.logger.info({ userData }, '开始创建用户');

      // 业务逻辑...
      const user = await this.userRepository.create(userData);

      this.logger.info({ userId: user.id }, '用户创建成功');
      return user;
    } catch (error) {
      this.logger.error({ err: error, userData }, '用户创建失败');
      throw error;
    }
  }
}
```

## 📝 日志级别和方法

### 可用的日志级别

- `debug()` - 调试信息
- `info()` - 常规信息
- `warn()` - 警告信息
- `error()` - 错误信息
- `fatal()` - 致命错误

### 正确的调用方式

```typescript
// ✅ 正确：上下文作为第一个参数
logger.info({ userId: 123, action: 'login' }, '用户登录');

// ✅ 正确：仅消息
logger.info('应用启动');

// ✅ 正确：错误日志
logger.error({ err: error, userId: 123 }, '用户操作失败');

// ❌ 错误：不要将上下文作为第二个参数
// logger.info("用户登录", { userId: 123 });
```

## 🔧 配置选项

### 环境变量

日志系统使用以下环境变量（在 `src/config/envConfig.ts` 中定义）：

```bash
# 日志级别 (debug, info, warn, error)
LOGGER_LEVEL=info

# 是否写入文件
LOG_TO_FILE=true

# 文件大小限制
LOG_FILE_MAX_SIZE=10MB

# 文件数量限制
LOG_FILE_MAX_FILES=10
```

### 不同环境的行为

- **开发环境** (`NODE_ENV=development`)
  - 启用彩色输出
  - 美化格式
  - 默认输出到控制台

- **生产环境** (`NODE_ENV=production`)
  - JSON 格式输出
  - 默认写入文件
  - 优化性能

## 🎯 最佳实践

### 1. 错误日志记录

```typescript
try {
  // 业务逻辑
} catch (error) {
  // ✅ 使用 err 字段记录错误对象
  logger.error({ err: error, userId, action: 'updateProfile' }, '更新用户资料失败');

  // ❌ 不要直接传递 error 作为消息
  // logger.error("更新失败", error);
}
```

### 2. 上下文信息

```typescript
// ✅ 包含有用的上下文信息
logger.info(
  {
    userId: user.id,
    email: user.email,
    action: 'registration',
    duration: Date.now() - startTime,
  },
  '用户注册成功',
);

// ✅ 在子日志器中添加持续的上下文
const requestLogger = logger.child({
  requestId: req.id,
  userId: req.user?.id,
});
```

### 3. 性能考虑

```typescript
// ✅ 仅在需要时计算昂贵的上下文
if (logger.isLevelEnabled('debug')) {
  logger.debug(
    {
      complexData: computeExpensiveData(),
    },
    '详细调试信息',
  );
}

// ✅ 使用适当的日志级别
logger.debug('详细的调试信息'); // 仅开发环境
logger.info('重要的业务事件'); // 生产环境可见
logger.error('需要关注的错误'); // 总是记录
```

## 📋 迁移对照表

从旧的封装日志系统迁移到新的Pino系统：

| 旧的封装API                             | 新的Pino API                    | 说明                   |
| --------------------------------------- | ------------------------------- | ---------------------- |
| `createAppLogger()`                     | `createAppPinoLogger()`         | 创建应用日志器（同步） |
| `getAccessLogger()`                     | `getAccessPinoLogger()`         | 获取访问日志器         |
| `createModuleLogger({ module: "xxx" })` | `createModulePinoLogger("xxx")` | 创建模块日志器         |
| `ILogger`                               | `PinoLogger`                    | 日志器类型             |

## 🔍 故障排除

### 常见问题

1. **TypeScript错误**：确保使用正确的参数顺序

   ```typescript
   // ✅ 正确
   logger.info({ data }, '消息');

   // ❌ 错误
   logger.info('消息', { data });
   ```

2. **日志不显示**：检查日志级别设置

   ```typescript
   // 检查当前级别
   console.log('当前日志级别:', process.env.LOGGER_LEVEL);

   // 检查是否启用
   if (logger.isLevelEnabled('debug')) {
     logger.debug('调试消息');
   }
   ```

3. **文件输出问题**：确保 `logs` 目录权限正确
   ```bash
   # 确保目录存在且可写
   mkdir -p logs
   chmod 755 logs
   ```

## 📚 更多资源

- [Pino官方文档](https://getpino.io/)
- [Pino最佳实践](https://getpino.io/#/docs/best-practices)
- [性能对比](https://getpino.io/#/docs/benchmarks)

## 🎉 完成！

您现在已经成功从封装的日志系统迁移到直接使用Pino！这将为您的应用提供更好的性能和更简单的维护。
