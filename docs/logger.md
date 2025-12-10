# 日志系统使用指南

本项目使用 Pino 作为日志系统，提供高性能、结构化的日志记录功能。

## 📋 目录

- [简介](#简介)
- [快速开始](#快速开始)
- [日志级别](#日志级别)
- [基本使用](#基本使用)
- [高级功能](#高级功能)
- [配置选项](#配置选项)
- [最佳实践](#最佳实践)

## 简介

### 为什么选择 Pino？

- ⚡ **高性能** - 比其他日志库快 5-10 倍
- 📊 **结构化日志** - JSON 格式，易于解析和分析
- 🎯 **类型安全** - 完整的 TypeScript 支持
- 🔧 **灵活配置** - 支持多种输出格式和传输方式
- 🎨 **开发友好** - 支持美化输出（pino-pretty）

### 日志系统架构

```
应用代码
    ↓
UnifiedLogger (统一日志接口)
    ↓
Pino Logger (底层实现)
    ↓
输出目标 (控制台/文件/远程服务)
```

## 快速开始

### 获取日志实例

```typescript
import { getLogger } from '@/core/logger';

const logger = getLogger();

logger.info('Application started');
logger.error('Something went wrong', error);
```

### 创建自定义日志实例

```typescript
import { createLogger } from '@/core/logger';

const customLogger = createLogger({
  level: 'debug',
  pretty: true,
  service: 'my-service',
});

customLogger.debug('Debug message');
```

## 日志级别

日志级别从低到高：

| 级别 | 数值 | 用途 | 示例 |
|------|------|------|------|
| `debug` | 20 | 调试信息 | 变量值、函数调用 |
| `info` | 30 | 一般信息 | 服务启动、请求处理 |
| `warn` | 40 | 警告信息 | 弃用功能、性能问题 |
| `error` | 50 | 错误信息 | 异常、失败操作 |

### 配置日志级别

在 `.env` 文件中设置：

```bash
LOGGER_LEVEL=info  # 只输出 info 及以上级别的日志
```

开发环境建议使用 `debug`，生产环境使用 `info` 或 `warn`。

## 基本使用

### Debug 日志

用于调试信息，生产环境通常不输出。

```typescript
import { getLogger } from '@/core/logger';

const logger = getLogger();

// 简单消息
logger.debug('Processing user data');

// 带元数据
logger.debug('User data processed', {
  userId: '123',
  duration: 150,
});
```

### Info 日志

用于记录正常的业务流程。

```typescript
// 服务启动
logger.info('Server started', {
  port: 8080,
  environment: 'production',
});

// 请求处理
logger.info('User login successful', {
  userId: user.id,
  email: user.email,
});

// 业务操作
logger.info('Order created', {
  orderId: order.id,
  amount: order.total,
});
```

### Warn 日志

用于记录潜在问题或需要注意的情况。

```typescript
// 性能警告
logger.warn('Query execution slow', {
  query: 'SELECT * FROM users',
  duration: 5000,
});

// 弃用警告
logger.warn('Using deprecated API', {
  endpoint: '/api/v1/users',
  replacement: '/api/v2/users',
});

// 资源警告
logger.warn('Memory usage high', {
  usage: '85%',
  threshold: '80%',
});
```

### Error 日志

用于记录错误和异常。

```typescript
// 带错误对象
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', error as Error, {
    operation: 'riskyOperation',
    userId: user.id,
  });
}

// 不带错误对象
logger.error('Invalid configuration', undefined, {
  config: 'database',
  reason: 'missing connection string',
});
```

## 高级功能

### 子日志器（Child Logger）

为特定模块或请求创建带有固定上下文的子日志器。

```typescript
import { getLogger } from '@/core/logger';

const logger = getLogger();

// 创建带有固定上下文的子日志器
const userLogger = logger.child({
  module: 'user-service',
  version: '1.0.0',
});

// 所有日志都会包含上述上下文
userLogger.info('User created', { userId: '123' });
// 输出: { module: 'user-service', version: '1.0.0', userId: '123', msg: 'User created' }

// 为每个请求创建子日志器
const requestLogger = logger.child({
  requestId: req.id,
  userId: req.user?.id,
});

requestLogger.info('Processing request');
requestLogger.info('Request completed');
```

### 请求日志中间件

自动记录所有 HTTP 请求。

```typescript
// src/shared/middleware/requestLogger.ts
import pinoHttp from 'pino-http';
import { getLogger } from '@/core/logger';

const logger = getLogger();

export default pinoHttp({
  logger,
  autoLogging: true,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },
});
```

输出示例：

```json
{
  "level": 30,
  "time": 1702345678901,
  "msg": "GET /api/users 200",
  "req": {
    "method": "GET",
    "url": "/api/users",
    "headers": {...}
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 45
}
```

### 结构化日志元数据

使用结构化数据增强日志信息。

```typescript
// 用户操作日志
logger.info('User action', {
  action: 'update_profile',
  userId: user.id,
  changes: {
    firstName: 'John',
    lastName: 'Doe',
  },
  timestamp: new Date().toISOString(),
});

// 数据库查询日志
logger.debug('Database query', {
  query: 'SELECT * FROM users WHERE id = $1',
  params: [userId],
  duration: 25,
  rowCount: 1,
});

// 外部 API 调用日志
logger.info('External API call', {
  service: 'payment-gateway',
  endpoint: '/api/v1/charge',
  method: 'POST',
  statusCode: 200,
  duration: 1200,
});
```

### 性能监控日志

记录性能指标。

```typescript
const startTime = Date.now();

try {
  const result = await expensiveOperation();
  
  const duration = Date.now() - startTime;
  
  logger.info('Operation completed', {
    operation: 'expensiveOperation',
    duration,
    success: true,
  });
  
  // 性能警告
  if (duration > 1000) {
    logger.warn('Slow operation detected', {
      operation: 'expensiveOperation',
      duration,
      threshold: 1000,
    });
  }
  
  return result;
} catch (error) {
  logger.error('Operation failed', error as Error, {
    operation: 'expensiveOperation',
    duration: Date.now() - startTime,
  });
  throw error;
}
```

### 请求追踪

使用 Request ID 追踪请求链路。

```typescript
// src/shared/middleware/requestId.middleware.ts
import { nanoid } from 'nanoid';

export const requestIdMiddleware = (req, res, next) => {
  req.id = req.headers['x-request-id'] || nanoid();
  res.setHeader('X-Request-ID', req.id);
  next();
};

// 在控制器中使用
export class UserController {
  async getUser(req: Request, res: Response) {
    const logger = getLogger().child({ requestId: req.id });
    
    logger.info('Fetching user', { userId: req.params.id });
    
    const user = await userService.findById(req.params.id);
    
    logger.info('User fetched successfully');
    
    res.json(user);
  }
}
```

### 敏感信息脱敏

避免记录敏感信息。

```typescript
// 脱敏工具函数
const sanitize = (data: any) => {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
  const sanitized = { ...data };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
};

// 使用
logger.info('User data', sanitize({
  email: 'user@example.com',
  password: 'secret123',  // 会被脱敏
  token: 'abc123',        // 会被脱敏
}));
```

## 配置选项

### 环境变量配置

```bash
# 日志级别
LOGGER_LEVEL=info

# 是否写入文件
LOG_TO_FILE=true

# 日志文件配置
LOG_FILE_MAX_SIZE=10MB
LOG_FILE_MAX_FILES=10

# 性能监控
LOG_PERFORMANCE_MONITORING=true

# 日志清理
LOG_CLEANUP_DAYS=30
```

### 日志格式配置

#### 开发环境（美化输出）

```typescript
const logger = createLogger({
  level: 'debug',
  pretty: true,  // 启用 pino-pretty
  service: 'my-app',
});
```

输出示例：

```
[2024-01-15 10:30:45.123] INFO: Server started
    port: 8080
    environment: "development"
```

#### 生产环境（JSON 格式）

```typescript
const logger = createLogger({
  level: 'info',
  pretty: false,  // 禁用美化，输出 JSON
  service: 'my-app',
});
```

输出示例：

```json
{"level":30,"time":1702345678901,"service":"my-app","msg":"Server started","port":8080,"environment":"production"}
```

### 自定义日志格式

```typescript
import pino from 'pino';

const logger = pino({
  level: 'info',
  formatters: {
    level: (label) => ({ level: label }),
    log: (object) => ({
      ...object,
      timestamp: new Date().toISOString(),
      service: 'my-app',
      environment: process.env.NODE_ENV,
    }),
  },
});
```

## 最佳实践

### 1. 使用合适的日志级别

```typescript
// ✅ 正确
logger.debug('Variable value', { value: x });        // 调试信息
logger.info('User logged in', { userId: user.id }); // 正常流程
logger.warn('Cache miss', { key: cacheKey });       // 潜在问题
logger.error('Database error', error);              // 错误异常

// ❌ 错误
logger.info('Variable value', { value: x });        // 应该用 debug
logger.error('User logged in', { userId: user.id }); // 应该用 info
```

### 2. 提供足够的上下文

```typescript
// ✅ 正确 - 提供完整上下文
logger.error('Failed to create order', error, {
  userId: user.id,
  productId: product.id,
  quantity: 5,
  totalAmount: 99.99,
});

// ❌ 错误 - 缺少上下文
logger.error('Failed to create order', error);
```

### 3. 使用结构化数据

```typescript
// ✅ 正确 - 结构化数据
logger.info('Payment processed', {
  orderId: '12345',
  amount: 99.99,
  currency: 'USD',
  paymentMethod: 'credit_card',
});

// ❌ 错误 - 字符串拼接
logger.info(`Payment processed: order=12345, amount=99.99, currency=USD`);
```

### 4. 避免记录敏感信息

```typescript
// ✅ 正确
logger.info('User authenticated', {
  userId: user.id,
  email: user.email,
  // 不记录密码
});

// ❌ 错误
logger.info('User authenticated', {
  userId: user.id,
  password: user.password,  // 不要记录密码！
});
```

### 5. 使用子日志器管理上下文

```typescript
// ✅ 正确 - 使用子日志器
class UserService {
  private logger = getLogger().child({ module: 'UserService' });

  async createUser(data: CreateUserDto) {
    this.logger.info('Creating user', { email: data.email });
    // ...
  }

  async updateUser(id: string, data: UpdateUserDto) {
    this.logger.info('Updating user', { userId: id });
    // ...
  }
}

// ❌ 错误 - 每次都手动添加上下文
class UserService {
  private logger = getLogger();

  async createUser(data: CreateUserDto) {
    this.logger.info('Creating user', { module: 'UserService', email: data.email });
    // ...
  }
}
```

### 6. 记录关键业务操作

```typescript
// 用户操作
logger.info('User registered', { userId: user.id, email: user.email });
logger.info('User logged in', { userId: user.id });
logger.info('Password changed', { userId: user.id });

// 业务操作
logger.info('Order created', { orderId: order.id, amount: order.total });
logger.info('Payment processed', { orderId: order.id, paymentId: payment.id });

// 系统操作
logger.info('Database migration completed', { version: '1.0.0' });
logger.info('Cache cleared', { pattern: 'user:*' });
```

### 7. 错误日志最佳实践

```typescript
// ✅ 正确 - 完整的错误信息
try {
  await userService.createUser(data);
} catch (error) {
  logger.error('Failed to create user', error as Error, {
    email: data.email,
    operation: 'createUser',
    timestamp: new Date().toISOString(),
  });
  throw error;
}

// ❌ 错误 - 丢失错误堆栈
try {
  await userService.createUser(data);
} catch (error) {
  logger.error('Failed to create user');  // 没有错误对象
  throw error;
}
```

### 8. 性能日志

```typescript
// 记录慢查询
const logSlowQuery = (query: string, duration: number) => {
  if (duration > 1000) {
    logger.warn('Slow query detected', {
      query,
      duration,
      threshold: 1000,
    });
  }
};

// 记录 API 响应时间
const logApiCall = (endpoint: string, duration: number, statusCode: number) => {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  logger[level]('API call completed', {
    endpoint,
    duration,
    statusCode,
  });
};
```

### 9. 日志采样（高流量场景）

```typescript
// 对高频日志进行采样
let requestCount = 0;
const SAMPLE_RATE = 100; // 每100个请求记录一次

app.use((req, res, next) => {
  requestCount++;
  
  if (requestCount % SAMPLE_RATE === 0) {
    logger.debug('Request sample', {
      method: req.method,
      url: req.url,
      sampleRate: SAMPLE_RATE,
    });
  }
  
  next();
});
```

### 10. 日志聚合和分析

```typescript
// 使用统一的日志格式便于聚合
logger.info('event', {
  eventType: 'user.login',
  userId: user.id,
  timestamp: Date.now(),
  metadata: {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  },
});

// 便于在日志聚合系统（如 ELK、Datadog）中查询：
// eventType:"user.login" AND userId:"123"
```

## 日志文件管理

### 日志轮转

日志文件会自动轮转，配置在环境变量中：

```bash
LOG_FILE_MAX_SIZE=10MB    # 单个文件最大大小
LOG_FILE_MAX_FILES=10     # 保留的文件数量
```

### 日志清理

定时任务会自动清理旧日志：

```typescript
// src/core/jobs/cleanup.job.ts
import { CronJob } from 'cron';
import { cleanupOldLogs } from '@/core/logger/cleanup';

const logCleanupJob = new CronJob('0 0 * * *', async () => {
  await cleanupOldLogs(env.LOG_CLEANUP_DAYS);
});
```

## 常见问题

### Q: 如何在生产环境查看美化的日志？

A: 使用 pino-pretty 工具：

```bash
# 实时查看
node dist/index.js | pnpm pino-pretty

# 查看日志文件
cat logs/app.log | pnpm pino-pretty
```

### Q: 如何集成第三方日志服务？

A: 使用 Pino 的传输机制：

```typescript
import pino from 'pino';

const logger = pino({
  transport: {
    targets: [
      {
        target: 'pino/file',
        options: { destination: './logs/app.log' },
      },
      {
        target: 'pino-sentry',
        options: { dsn: process.env.SENTRY_DSN },
      },
    ],
  },
});
```

### Q: 如何减少日志输出量？

A: 
1. 提高日志级别（info → warn → error）
2. 使用日志采样
3. 移除不必要的 debug 日志
4. 对高频操作使用计数器而非每次记录

### Q: 如何追踪跨服务的请求？

A: 使用分布式追踪 ID：

```typescript
// 生成或传递 trace ID
const traceId = req.headers['x-trace-id'] || nanoid();
const logger = getLogger().child({ traceId });

// 在调用其他服务时传递
await fetch(url, {
  headers: {
    'X-Trace-ID': traceId,
  },
});
```

## 相关资源

- [Pino 官方文档](https://getpino.io/)
- [Pino Pretty 文档](https://github.com/pinojs/pino-pretty)
- [日志最佳实践](https://www.loggly.com/ultimate-guide/node-logging-basics/)
