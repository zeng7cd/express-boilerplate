# 中间件使用指南

本文档介绍项目中常用中间件的使用方法和开发规范。

## 目录

- [内置中间件](#内置中间件)
- [认证中间件](#认证中间件)
- [自定义中间件](#自定义中间件)
- [中间件执行顺序](#中间件执行顺序)
- [最佳实践](#最佳实践)

## 内置中间件

### 1. 认证中间件 (authenticateJWT)

验证 JWT token 并将用户信息注入到 `req.user`。

```typescript
import { authenticateJWT } from '@/shared/middleware/auth.middleware';

// 保护单个路由
router.get('/profile', authenticateJWT, userController.getProfile);

// 保护整个路由组
router.use(authenticateJWT);
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
```

### 2. 角色验证中间件 (requireRoles)

验证用户是否具有指定角色。

```typescript
import { requireRoles } from '@/shared/middleware/auth.middleware';

// 需要 admin 或 moderator 角色
router.delete(
  '/users/:id',
  authenticateJWT,
  requireRoles(['admin', 'moderator']),
  userController.deleteUser
);
```

### 3. 权限验证中间件 (requirePermissions)

验证用户是否具有指定权限。

```typescript
import { requirePermissions } from '@/shared/middleware/auth.middleware';

// 需要 users:write 权限
router.post(
  '/users',
  authenticateJWT,
  requirePermissions(['users:write']),
  userController.createUser
);

// 需要多个权限
router.put(
  '/users/:id/roles',
  authenticateJWT,
  requirePermissions(['users:write', 'roles:assign']),
  userController.assignRoles
);
```

### 4. 请求日志中间件

自动记录所有请求信息。

```typescript
// 在 src/server.ts 中已全局启用
app.use(requestLogger);
```

### 5. 限流中间件

防止 API 滥用。

```typescript
// 全局限流（在 src/server.ts 中配置）
app.use(rateLimiter);

// 自定义限流
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 5, // 最多 5 次请求
  message: 'Too many login attempts, please try again later',
});

router.post('/login', loginLimiter, authController.login);
```

### 6. 请求 ID 中间件

为每个请求生成唯一 ID。

```typescript
// 在 src/server.ts 中已全局启用
app.use(requestIdMiddleware);

// 在控制器中使用
router.get('/test', (req, res) => {
  console.log('Request ID:', req.id);
  res.json({ requestId: req.id });
});
```

### 7. 请求上下文中间件

提供请求级别的上下文存储。

```typescript
// 在 src/server.ts 中已全局启用
app.use(requestContextMiddleware);

// 在任何地方访问请求上下文
import { getRequestContext } from '@/shared/middleware/requestContext.middleware';

const context = getRequestContext();
console.log('User ID:', context.userId);
console.log('Request ID:', context.requestId);
```

## 认证中间件详解

### JWT 认证流程

```typescript
// 1. 客户端发送请求，携带 token
// Authorization: Bearer <token>

// 2. 中间件验证 token
export const authenticateJWT = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.substring(7);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_REQUIRED',
        message: 'Access token required',
      });
    }

    // 验证 token
    const decoded = jwtService.verifyAccessToken(token);
    
    // 检查黑名单
    const isBlacklisted = await tokenBlacklistService.isBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_REVOKED',
        message: 'Token has been revoked',
      });
    }

    // 注入用户信息
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    });
  }
};
```

### 访问用户信息

```typescript
router.get('/profile', authenticateJWT, (req, res) => {
  // req.user 包含 JWT payload
  const { sub: userId, email, roles, permissions } = req.user;
  
  res.json({
    userId,
    email,
    roles,
    permissions,
  });
});
```

## 自定义中间件

### 基础结构

```typescript
import type { Request, Response, NextFunction } from 'express';

export const myMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 执行逻辑
  console.log('Middleware executed');
  
  // 继续下一个中间件
  next();
};
```

### 带参数的中间件

```typescript
export const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }
    
    next();
  };
};

// 使用
router.delete('/users/:id', authenticateJWT, checkRole(['admin']), controller.delete);
```

### 异步中间件

```typescript
export const asyncMiddleware = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 使用
router.get('/data', asyncMiddleware(async (req, res) => {
  const data = await fetchData();
  res.json(data);
}));
```

### 验证中间件

```typescript
import { z } from 'zod';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          errors: error.errors,
        });
      }
      next(error);
    }
  };
};

// 使用
const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8),
});

router.post('/users', validate(createUserSchema), controller.create);
```

## 中间件执行顺序

### 全局中间件顺序

在 `src/server.ts` 中的顺序很重要：

```typescript
// 1. 请求 ID（必须最先）
app.use(requestIdMiddleware);

// 2. 请求上下文
app.use(requestContextMiddleware);

// 3. 请求日志
app.use(requestLogger);

// 4. 安全头
app.use(securityHeaders);

// 5. 解析请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 6. CORS
app.use(cors());

// 7. 安全防护
app.use(helmet());

// 8. 限流
app.use(rateLimiter);

// 9. 路由
app.use('/api', apiRoutes);

// 10. 404 处理
app.use(notFoundHandler);

// 11. 错误处理（必须最后）
app.use(errorHandler);
```

### 路由级中间件顺序

```typescript
router.post(
  '/admin/users',
  authenticateJWT,           // 1. 先验证身份
  requireRoles(['admin']),   // 2. 再验证角色
  validate(createUserSchema), // 3. 然后验证数据
  controller.createUser      // 4. 最后执行业务逻辑
);
```

## 错误处理中间件

### 全局错误处理器

```typescript
// src/shared/middleware/errorHandler.ts
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  // Prisma 错误
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_ENTRY',
        message: 'Resource already exists',
      });
    }
  }

  // 默认错误
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
};
```

### 自定义错误类

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 使用
throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
```

## 最佳实践

### 1. 中间件应该单一职责

```typescript
// ❌ 不好：一个中间件做太多事
const badMiddleware = (req, res, next) => {
  // 验证 token
  // 检查权限
  // 记录日志
  // 验证数据
  next();
};

// ✅ 好：每个中间件只做一件事
router.post(
  '/users',
  authenticateJWT,
  requirePermissions(['users:write']),
  validate(schema),
  controller.create
);
```

### 2. 使用 TypeScript 类型

```typescript
import type { Request, Response, NextFunction, RequestHandler } from 'express';

// 扩展 Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      id?: string;
    }
  }
}

// 使用 RequestHandler 类型
export const myMiddleware: RequestHandler = (req, res, next) => {
  // TypeScript 会提供类型检查
  next();
};
```

### 3. 错误处理

```typescript
// ❌ 不好：忘记错误处理
router.get('/data', async (req, res) => {
  const data = await fetchData(); // 如果出错会导致应用崩溃
  res.json(data);
});

// ✅ 好：使用 try-catch 或 asyncHandler
router.get('/data', async (req, res, next) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (error) {
    next(error);
  }
});
```

### 4. 中间件复用

```typescript
// 创建可复用的中间件组合
const adminOnly = [
  authenticateJWT,
  requireRoles(['admin']),
];

const moderatorOrAdmin = [
  authenticateJWT,
  requireRoles(['admin', 'moderator']),
];

// 使用
router.delete('/users/:id', ...adminOnly, controller.delete);
router.put('/posts/:id', ...moderatorOrAdmin, controller.update);
```

### 5. 性能考虑

```typescript
// ❌ 不好：每次请求都查询数据库
router.use(async (req, res, next) => {
  const settings = await prisma.settings.findMany();
  req.settings = settings;
  next();
});

// ✅ 好：使用缓存
router.use(async (req, res, next) => {
  const cached = await cache.get('settings');
  if (cached) {
    req.settings = cached;
  } else {
    const settings = await prisma.settings.findMany();
    await cache.set('settings', settings, 3600);
    req.settings = settings;
  }
  next();
});
```

## 常用中间件示例

### IP 白名单

```typescript
export const ipWhitelist = (allowedIps: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip;
    
    if (!allowedIps.includes(clientIp)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }
    
    next();
  };
};
```

### API 版本检查

```typescript
export const checkApiVersion = (req: Request, res: Response, next: NextFunction) => {
  const version = req.headers['api-version'];
  
  if (!version || version !== '1.0') {
    return res.status(400).json({
      success: false,
      message: 'Invalid API version',
    });
  }
  
  next();
};
```

### 请求大小限制

```typescript
export const limitRequestSize = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        message: 'Request too large',
      });
    }
    
    next();
  };
};
```

## 相关文档

- [Router 使用指南](./router-guide.md)
- [认证授权指南](./auth-guide.md)
- [API 开发指南](./api-development.md)
