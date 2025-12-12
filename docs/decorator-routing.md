# 装饰器路由系统

## 概述

本项目使用基于装饰器的路由注册系统，提供了更加简洁、类型安全和易于维护的路由定义方式。

## 核心特性

- ✅ **声明式路由定义**：使用装饰器直接在控制器类和方法上定义路由
- ✅ **自动路由注册**：无需手动创建 Router 实例和注册路由
- ✅ **类型安全**：完整的 TypeScript 类型支持
- ✅ **中间件支持**：支持类级别和方法级别的中间件
- ✅ **认证装饰器**：内置认证和权限控制装饰器
- ✅ **系统路由支持**：支持系统路由（不添加 API 前缀）
- ✅ **可扩展性**：易于添加自定义装饰器

## 快速开始

### 1. 创建控制器

```typescript
import { Controller, Get, Post, Auth, Public } from '@/core/router';
import type { Request, Response } from 'express';

@Controller('/users', {
  description: '用户管理接口',
})
export class UserController {
  /**
   * 获取用户列表（需要认证）
   */
  @Auth()
  @Get('/', {
    description: '获取用户列表',
  })
  async getUsers(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: [],
    });
  }

  /**
   * 创建用户（公开接口）
   */
  @Public()
  @Post('/', {
    description: '创建用户',
  })
  async createUser(req: Request, res: Response): Promise<void> {
    res.status(201).json({
      success: true,
      data: req.body,
    });
  }
}
```

### 2. 注册控制器

在 `src/controllers.ts` 中导入你的控制器：

```typescript
// 导入控制器以触发装饰器注册
import './modules/users/controllers/user.controller';
```

就这么简单！路由会自动注册到应用中。

## 装饰器 API

### @Controller

定义控制器类和路由前缀。

```typescript
@Controller(prefix: string, options?: {
  middlewares?: RequestHandler[];
  description?: string;
  isSystemRoute?: boolean;
})
```

**参数：**
- `prefix`: 路由前缀，例如 `/users`
- `options.middlewares`: 应用于所有路由的中间件数组
- `options.description`: 控制器描述
- `options.isSystemRoute`: 是否为系统路由（不添加 `/api` 前缀）

**示例：**

```typescript
// 业务路由（会添加 /api 前缀）
@Controller('/users', {
  description: '用户管理',
})
export class UserController {}

// 系统路由（不添加 /api 前缀）
@Controller('/health-check', {
  description: '健康检查',
  isSystemRoute: true,
})
export class HealthCheckController {}
```

### HTTP 方法装饰器

定义路由处理方法。

```typescript
@Get(path: string, options?: { middlewares?: RequestHandler[]; description?: string; })
@Post(path: string, options?: { middlewares?: RequestHandler[]; description?: string; })
@Put(path: string, options?: { middlewares?: RequestHandler[]; description?: string; })
@Patch(path: string, options?: { middlewares?: RequestHandler[]; description?: string; })
@Delete(path: string, options?: { middlewares?: RequestHandler[]; description?: string; })
@Options(path: string, options?: { middlewares?: RequestHandler[]; description?: string; })
@Head(path: string, options?: { middlewares?: RequestHandler[]; description?: string; })
```

**示例：**

```typescript
@Get('/profile', {
  description: '获取用户资料',
})
async getProfile(req: Request, res: Response): Promise<void> {
  // 处理逻辑
}

@Post('/login', {
  middlewares: [rateLimiter],
  description: '用户登录',
})
async login(req: Request, res: Response): Promise<void> {
  // 处理逻辑
}
```

### @UseMiddleware

应用中间件到控制器或方法。

```typescript
@UseMiddleware(...middlewares: RequestHandler[])
```

**示例：**

```typescript
// 应用到整个控制器
@Controller('/admin')
@UseMiddleware(authenticateJWT, checkAdminRole)
export class AdminController {}

// 应用到单个方法
@UseMiddleware(rateLimiter)
@Post('/login')
async login(req: Request, res: Response): Promise<void> {}
```

### @Auth

认证装饰器，应用 JWT 认证中间件。

```typescript
@Auth()
```

**示例：**

```typescript
@Auth()
@Get('/me')
async getCurrentUser(req: Request, res: Response): Promise<void> {
  // req.user 包含认证用户信息
}
```

### @Public

标记公开路由（无需认证）。这是一个文档装饰器，用于提高代码可读性。

```typescript
@Public()
```

**示例：**

```typescript
@Public()
@Post('/register')
async register(req: Request, res: Response): Promise<void> {
  // 公开注册接口
}
```

## 完整示例

### 认证控制器

```typescript
import type { Request, Response } from 'express';
import { Controller, Post, Get, Auth, Public } from '@/core/router';

@Controller('/auth', {
  description: '认证相关接口',
})
export class AuthController {
  @Public()
  @Post('/register', {
    description: '用户注册',
  })
  async register(req: Request, res: Response): Promise<void> {
    // 注册逻辑
  }

  @Public()
  @Post('/login', {
    description: '用户登录',
  })
  async login(req: Request, res: Response): Promise<void> {
    // 登录逻辑
  }

  @Auth()
  @Post('/logout', {
    description: '用户登出',
  })
  async logout(req: Request, res: Response): Promise<void> {
    // 登出逻辑
  }

  @Auth()
  @Get('/me', {
    description: '获取当前用户信息',
  })
  async me(req: Request, res: Response): Promise<void> {
    // 获取用户信息
  }
}
```

### 系统路由控制器

```typescript
import type { Request, Response } from 'express';
import { Controller, Get } from '@/core/router';

@Controller('/health-check', {
  description: '系统健康检查',
  isSystemRoute: true, // 不添加 /api 前缀
})
export class HealthCheckController {
  @Get('/', {
    description: '基础健康检查',
  })
  async basicHealthCheck(_req: Request, res: Response): Promise<void> {
    res.json({ status: 'ok' });
  }

  @Get('/detailed', {
    description: '详细健康检查',
  })
  async detailedHealthCheck(_req: Request, res: Response): Promise<void> {
    // 详细检查逻辑
  }
}
```

## 路由注册流程

1. **定义控制器**：使用 `@Controller` 装饰器定义控制器类
2. **定义路由**：使用 HTTP 方法装饰器定义路由处理方法
3. **导入控制器**：在 `src/controllers.ts` 中导入控制器
4. **自动注册**：装饰器系统自动将路由注册到 Express 应用

## 中间件执行顺序

中间件按以下顺序执行：

1. 全局中间件（在 `server.ts` 中定义）
2. 控制器级别中间件（`@Controller` 的 `middlewares` 选项）
3. 方法级别中间件（HTTP 方法装饰器的 `middlewares` 选项）
4. 路由处理器

## 扩展装饰器

你可以轻松创建自定义装饰器：

```typescript
import { UseMiddleware } from '@/core/router';
import type { RequestHandler } from 'express';

// 创建角色检查装饰器
export function RequireRole(...roles: string[]): MethodDecorator {
  const middleware: RequestHandler = (req, res, next) => {
    if (!req.user || !roles.some(role => req.user.roles.includes(role))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
  
  return UseMiddleware(middleware);
}

// 使用自定义装饰器
@RequireRole('admin', 'moderator')
@Delete('/users/:id')
async deleteUser(req: Request, res: Response): Promise<void> {
  // 只有 admin 或 moderator 可以访问
}
```

## 最佳实践

1. **单一职责**：每个控制器应该只负责一个资源或功能域
2. **清晰的路由结构**：使用有意义的路由前缀和路径
3. **添加描述**：为控制器和路由添加描述，便于文档生成
4. **合理使用中间件**：在适当的级别应用中间件（全局、控制器、方法）
5. **类型安全**：充分利用 TypeScript 的类型系统
6. **错误处理**：在控制器方法中妥善处理错误

## 迁移指南

### 从传统路由迁移

**之前（传统方式）：**

```typescript
// routes.ts
import { Router } from 'express';
import { authController } from './controllers/auth.controller';
import { authenticateJWT } from '@/shared/middleware/auth.middleware';

const router = Router();

router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/logout', authenticateJWT, authController.logout.bind(authController));
router.get('/me', authenticateJWT, authController.me.bind(authController));

export default router;
```

**之后（装饰器方式）：**

```typescript
// auth.controller.ts
import { Controller, Post, Get, Auth, Public } from '@/core/router';

@Controller('/auth')
export class AuthController {
  @Public()
  @Post('/register')
  async register(req: Request, res: Response): Promise<void> {}

  @Public()
  @Post('/login')
  async login(req: Request, res: Response): Promise<void> {}

  @Auth()
  @Post('/logout')
  async logout(req: Request, res: Response): Promise<void> {}

  @Auth()
  @Get('/me')
  async me(req: Request, res: Response): Promise<void> {}
}
```

## 故障排除

### 路由未注册

确保：
1. 控制器已在 `src/controllers.ts` 中导入
2. `reflect-metadata` 已在 `src/index.ts` 最顶部导入
3. `tsconfig.json` 中启用了 `experimentalDecorators` 和 `emitDecoratorMetadata`

### 中间件未执行

检查：
1. 中间件是否正确传递给装饰器
2. 中间件执行顺序是否正确
3. 中间件是否调用了 `next()`

### TypeScript 错误

确保：
1. 安装了所有必要的类型定义包
2. TypeScript 版本 >= 5.0
3. 正确配置了路径别名（`@/*`）

## 总结

装饰器路由系统提供了一种现代化、类型安全且易于维护的路由定义方式。通过声明式的语法，代码更加清晰易读，同时保持了高度的灵活性和可扩展性。
