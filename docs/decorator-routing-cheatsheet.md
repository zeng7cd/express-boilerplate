# 装饰器路由系统速查表

## 快速开始

```typescript
import { Controller, Get, Post, Auth, Public } from '@/core/router';

@Controller('/users')
export class UserController {
  @Get('/')
  async list(req: Request, res: Response) {}
}
```

## 核心装饰器

### @Controller

```typescript
// 基础用法
@Controller('/users')

// 带选项
@Controller('/users', {
  middlewares: [middleware1, middleware2],
  description: '用户管理',
  isSystemRoute: false, // true = 不添加 /api 前缀
})
```

### HTTP 方法

```typescript
@Get('/path')           // GET 请求
@Post('/path')          // POST 请求
@Put('/path')           // PUT 请求
@Patch('/path')         // PATCH 请求
@Delete('/path')        // DELETE 请求
@Options('/path')       // OPTIONS 请求
@Head('/path')          // HEAD 请求

// 带选项
@Get('/path', {
  middlewares: [middleware1],
  description: '描述',
})
```

### @UseMiddleware

```typescript
// 类级别
@Controller('/admin')
@UseMiddleware(auth, checkRole)
export class AdminController {}

// 方法级别
@UseMiddleware(rateLimiter)
@Post('/login')
async login() {}
```

### @Auth

```typescript
// 需要认证
@Auth()
@Get('/profile')
async getProfile() {}
```

### @Public

```typescript
// 公开路由（标记用）
@Public()
@Post('/register')
async register() {}
```

## 常见模式

### RESTful 资源

```typescript
@Controller('/users')
export class UserController {
  @Get('/')
  async list() {}
  
  @Get('/:id')
  async get() {}
  
  @Post('/')
  async create() {}
  
  @Put('/:id')
  async update() {}
  
  @Delete('/:id')
  async delete() {}
}
```

### 嵌套路由

```typescript
@Controller('/users/:userId/posts')
export class UserPostController {
  @Get('/')
  async getUserPosts(req: Request, res: Response) {
    const { userId } = req.params;
  }
}
```

### 认证路由

```typescript
@Controller('/auth')
export class AuthController {
  @Public()
  @Post('/login')
  async login() {}
  
  @Auth()
  @Post('/logout')
  async logout() {}
}
```

### 系统路由

```typescript
@Controller('/health-check', {
  isSystemRoute: true, // 不添加 /api 前缀
})
export class HealthCheckController {
  @Get('/')
  async check() {}
}
```

### 多个中间件

```typescript
@Controller('/upload')
export class UploadController {
  @Auth()
  @Post('/', {
    middlewares: [rateLimiter, upload.single('file')],
  })
  async upload() {}
}
```

### 版本化 API

```typescript
@Controller('/v1/users')
export class UserControllerV1 {}

@Controller('/v2/users')
export class UserControllerV2 {}
```

## 注册控制器

```typescript
// src/controllers.ts
import './modules/users/controllers/user.controller';
import './modules/auth/controllers/auth.controller';
```

## 中间件执行顺序

```
全局中间件
    ↓
控制器中间件 (@Controller middlewares)
    ↓
方法中间件 (@Get/@Post middlewares)
    ↓
路由处理器
```

## 装饰器执行顺序

```typescript
@Decorator1  // 最后执行
@Decorator2  // 第二执行
@Decorator3  // 第一执行
method() {}
```

## 路径规则

```typescript
// 业务路由（默认）
@Controller('/users')
// 生成: /api/users

// 系统路由
@Controller('/health', { isSystemRoute: true })
// 生成: /health

// 路由参数
@Get('/:id')
// 生成: /api/users/:id

// 嵌套路径
@Get('/profile/settings')
// 生成: /api/users/profile/settings
```

## 类型定义

```typescript
import type { Request, Response } from 'express';

async handler(req: Request, res: Response): Promise<void> {
  // 实现
}
```

## 自定义装饰器

```typescript
import { UseMiddleware } from '@/core/router';
import type { RequestHandler } from 'express';

export function RequireRole(...roles: string[]): MethodDecorator {
  const middleware: RequestHandler = (req, res, next) => {
    // 检查逻辑
    next();
  };
  return UseMiddleware(middleware);
}

// 使用
@RequireRole('admin')
@Delete('/users/:id')
async deleteUser() {}
```

## 常见错误

### ❌ 忘记导入 reflect-metadata

```typescript
// src/index.ts
import 'reflect-metadata'; // 必须在最前面
```

### ❌ 忘记注册控制器

```typescript
// src/controllers.ts
import './modules/users/controllers/user.controller';
```

### ❌ 忘记绑定 this

```typescript
// ✅ 正确 - 装饰器自动绑定
@Get('/')
async handler(req: Request, res: Response) {
  this.someMethod(); // 可以访问
}
```

### ❌ 返回类型错误

```typescript
// ❌ 错误
@Get('/')
async handler(): string {
  return 'hello';
}

// ✅ 正确
@Get('/')
async handler(req: Request, res: Response): Promise<void> {
  res.send('hello');
}
```

## 调试技巧

### 查看注册的路由

启动应用时，控制台会打印：

```
📋 Route Configuration:
============================================================

🔧 System Routes:
  /health-check                 - 系统健康检查

🌐 API Routes (prefix: /api):
  /api/auth                     - 认证相关接口
  /api/users                    - 用户管理接口

============================================================
```

### 添加日志

```typescript
@Get('/')
async handler(req: Request, res: Response) {
  console.log('Handler called');
  // 实现
}
```

## 最佳实践

✅ 使用有意义的路由前缀  
✅ 为控制器和路由添加描述  
✅ 合理组织中间件层级  
✅ 保持控制器单一职责  
✅ 使用 TypeScript 类型  
✅ 妥善处理错误  
✅ 添加注释文档  

## 性能提示

- 装饰器只在启动时执行一次
- 运行时性能与传统路由相同
- 元数据在编译时确定
- 无运行时反射开销

## 资源链接

- [完整文档](./decorator-routing.md)
- [架构设计](./router.decorator.md)
- [迁移指南](./migration-guide.md)
- [示例代码](../examples/user.controller.example.ts)

---

**提示：** 将此文件保存为书签，随时查阅！
