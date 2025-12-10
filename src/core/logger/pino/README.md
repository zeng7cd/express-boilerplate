# Pino日志系统使用指南

## 📖 概述

本项目使用Pino作为日志库，提供高性能、结构化的日志记录功能。日志系统支持多种输出方式（控制台、文件），并根据环境自动调整配置。

## 🚀 快速开始

### 1. 基础用法

```typescript
import { getAppPinoLogger, createModulePinoLogger } from '@/core/logger/pino';

// 获取全局应用日志器（推荐，单例模式）
const logger = getAppPinoLogger();
logger.info('应用启动成功');

// 创建模块日志器
const moduleLogger = createModulePinoLogger('user-service');
moduleLogger.info({ userId: 123 }, '用户登录成功');
```

### 2. 在服务类中使用

```typescript
import { getAppPinoLogger, type PinoLogger } from '@/core/logger/pino';

class UserService {
  private readonly logger: PinoLogger;

  constructor() {
    // 推荐：使用全局日志器
    this.logger = getAppPinoLogger();
    
    // 或者：创建模块专用日志器
    // this.logger = createModulePinoLogger('user-service');
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

日志系统使用以下环境变量（在 `src/core/config/env.ts` 中定义）：

```bash
# 日志级别 (debug, info, warn, error)
LOGGER_LEVEL=info

# 是否写入文件
LOG_TO_FILE=true

# 文件大小限制
LOG_FILE_MAX_SIZE=10MB

# 文件数量限制
LOG_FILE_MAX_FILES=10

# 日志清理天数
LOG_CLEANUP_DAYS=30

# 健康检查间隔（秒）
LOG_HEALTH_CHECK_INTERVAL=60

# 性能监控
LOG_PERFORMANCE_MONITORING=true
```

### 不同环境的行为

- **开发环境** (`NODE_ENV=development`)
  - 使用 `pino-pretty` 美化输出
  - 启用彩色输出
  - 时间戳格式化为可读格式
  - 默认输出到控制台

- **生产环境** (`NODE_ENV=production`)
  - JSON 格式输出（便于日志收集系统解析）
  - 自动写入文件到 `logs/` 目录
  - 优化性能，减少格式化开销

- **测试环境** (`NODE_ENV=test`)
  - 根据 `LOG_TO_FILE` 配置决定输出方式

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

## 📦 可用的API

### 工厂函数

| 函数名                      | 说明                                   | 使用场景                     |
| --------------------------- | -------------------------------------- | ---------------------------- |
| `getAppPinoLogger()`        | 获取全局应用日志器（单例）             | **推荐**：大多数场景         |
| `getAccessPinoLogger()`     | 获取全局访问日志器（单例）             | HTTP请求日志                 |
| `createAppPinoLogger()`     | 创建新的应用日志器实例                 | 需要独立实例时               |
| `createAccessPinoLogger()`  | 创建新的访问日志器实例                 | 需要独立实例时               |
| `createModulePinoLogger()`  | 创建模块专用日志器                     | 模块级别的日志隔离           |
| `createCustomPinoLogger()`  | 创建自定义配置的日志器                 | 特殊需求                     |
| `resetPinoLoggers()`        | 重置缓存的日志器实例                   | 测试环境                     |

### 类型定义

```typescript
import type { PinoLogger } from '@/core/logger/pino';
// 等同于 import type { Logger } from 'pino';
```

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

3. **文件输出问题**：确保 `logs` 目录存在且可写
   ```bash
   # Windows
   mkdir logs
   
   # Linux/Mac
   mkdir -p logs
   chmod 755 logs
   ```

4. **开发环境日志不美化**：确保安装了 `pino-pretty`
   ```bash
   pnpm install -D pino-pretty
   ```

5. **日志文件路径**：所有日志文件默认输出到项目根目录的 `logs/` 文件夹
   - 应用日志：`logs/app.log`
   - 访问日志：`logs/access.log`
   - 模块日志：`logs/{moduleName}.log`

## 🎨 实际使用示例

### 中间件中使用

```typescript
import { getAppPinoLogger } from '@/core/logger/pino';

export const myMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const logger = getAppPinoLogger();
  
  logger.info({ 
    requestId: req.id,
    method: req.method,
    path: req.path 
  }, '处理请求');
  
  next();
};
```

### 服务类中使用

```typescript
import { getAppPinoLogger } from '@/core/logger/pino';

export class AuditService {
  private readonly logger = getAppPinoLogger();

  async logAction(params: AuditLogParams) {
    try {
      this.logger.info({ params }, '记录审计日志');
      // 业务逻辑...
    } catch (error) {
      this.logger.error({ err: error, params }, '审计日志记录失败');
      throw error;
    }
  }
}
```

### 装饰器中使用

```typescript
import { getAppPinoLogger } from '@/core/logger/pino';

const logger = getAppPinoLogger();

export function Cache(ttl: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      logger.debug({ method: propertyKey, ttl }, '检查缓存');
      // 缓存逻辑...
    };
    
    return descriptor;
  };
}
```

## 📚 更多资源

- [Pino官方文档](https://getpino.io/)
- [Pino最佳实践](https://getpino.io/#/docs/best-practices)
- [性能对比](https://getpino.io/#/docs/benchmarks)
- [pino-pretty文档](https://github.com/pinojs/pino-pretty)

## 📂 项目文件结构

```
src/core/logger/pino/
├── index.ts          # 统一导出
├── factory.ts        # 日志器工厂函数
├── config.ts         # 配置生成函数
└── README.md         # 本文档
```
