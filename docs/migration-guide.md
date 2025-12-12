# 路由系统迁移指南

## 概述

本指南将帮助你从传统的 Express 路由系统迁移到基于装饰器的路由系统。

## 迁移步骤

### 步骤 1：保留旧代码（可选）

在迁移过程中，你可以保留旧的路由文件作为参考：

```bash
# 重命名旧文件
mv src/modules/auth/routes.ts src/modules/auth/routes.old.ts
mv src/modules/auth/controllers/auth.controller.ts src/modules/auth/controllers/auth.controller.old.ts
```

### 步骤 2：创建新的控制器

使用装饰器重写控制器：

**旧代码 (auth.controller.ts):**

```typescript
export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    // 实现
  }
  
  async login(req: Request, res: Response): Promise<void> {
    // 实现
  }
}

export const authController = new AuthController();
```

**新代码 (auth.controller.decorator.ts):**

```typescript
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
    // 实现（保持不变）
  }
  
  @Public()
  @Post('/login', {
    description: '用户登录',
  })
  async login(req: Request, res: Response): Promise<void> {
    // 实现（保持不变）
  }
}
```

### 步骤 3：删除路由文件

删除旧的路由文件（如 `routes.ts`），因为路由现在通过装饰器定义。

### 步骤 4：注册控制器

在 `src/controllers.ts` 中导入新控制器：

```typescript
// 导入控制器以触发装饰器注册
import './modules/auth/controllers/auth.controller.decorator';
```

### 步骤 5：测试

启动应用并测试所有路由是否正常工作：

```bash
pnpm start:dev
```

检查控制台输出，确认路由已正确注册。

## 迁移对照表

### 基础路由

**旧方式:**
```typescript
// routes.ts
const router = Router();
router.get('/users', userController.getUsers.bind(userController));
router.post('/users', userController.createUser.bind(userController));
```

**新方式:**
```typescript
// user.controller.ts
@Controller('/users')
export class UserController {
  @Get('/')
  async getUsers(req: Request, res: Response) {}
  
  @Post('/')
  async createUser(req: Request, res: Response) {}
}
```

### 带中间件的路由

**旧方式:**
```typescript
router.get('/profile', authenticateJWT, userController.getProfile.bind(userController));
```

**新方式:**
```typescript
@Auth()
@Get('/profile')
async getProfile(req: Request, res: Response) {}
```

### 控制器级中间件

**旧方式:**
```typescript
const router = Router();
router.use(authenticateJWT);
router.get('/admin/users', adminController.getUsers.bind(adminController));
router.post('/admin/users', adminController.createUser.bind(adminController));
```

**新方式:**
```typescript
@Controller('/admin')
@UseMiddleware(authenticateJWT)
export class AdminController {
  @Get('/users')
  async getUsers(req: Request, res: Response) {}
  
  @Post('/users')
  async createUser(req: Request, res: Response) {}
}
```

### 系统路由（不带 API 前缀）

**旧方式:**
```typescript
// routes.ts
export const systemRoutes = {
  healthCheck: {
    path: '/health-check',
    router: healthCheckRouter,
  },
};

// server.ts
Object.entries(systemRoutes).forEach(([, { path, router }]) => {
  app.use(path, router);
});
```

**新方式:**
```typescript
@Controller('/health-check', {
  isSystemRoute: true,
})
export class HealthCheckController {
  @Get('/')
  async check(req: Request, res: Response) {}
}
```

### 多个中间件

**旧方式:**
```typescript
router.post('/upload', 
  authenticateJWT, 
  rateLimiter, 
  upload.single('file'),
  uploadController.upload.bind(uploadController)
);
```

**新方式:**
```typescript
@Auth()
@Post('/upload', {
  middlewares: [rateLimiter, upload.single('file')],
})
async upload(req: Request, res: Response) {}
```

## 常见模式迁移

### 1. RESTful 资源路由

**旧方式:**
```typescript
const router = Router();
router.get('/users', controller.list);
router.get('/users/:id', controller.get);
router.post('/users', controller.create);
router.put('/users/:id', controller.update);
router.delete('/users/:id', controller.delete);
```

**新方式:**
```typescript
@Controller('/users')
export class UserController {
  @Get('/')
  async list(req: Request, res: Response) {}
  
  @Get('/:id')
  async get(req: Request, res: Response) {}
  
  @Post('/')
  async create(req: Request, res: Response) {}
  
  @Put('/:id')
  async update(req: Request, res: Response) {}
  
  @Delete('/:id')
  async delete(req: Request, res: Response) {}
}
```

### 2. 嵌套路由

**旧方式:**
```typescript
// users/routes.ts
const router = Router();
router.use('/:userId/posts', postRoutes);

// posts/routes.ts
const postRouter = Router({ mergeParams: true });
postRouter.get('/', postController.getUserPosts);
```

**新方式:**
```typescript
@Controller('/users/:userId/posts')
export class UserPostController {
  @Get('/')
  async getUserPosts(req: Request, res: Response) {
    const userId = req.params.userId;
    // 实现
  }
}
```

### 3. 版本化 API

**旧方式:**
```typescript
// v1/routes.ts
const v1Router = Router();
v1Router.use('/users', userRoutesV1);

// v2/routes.ts
const v2Router = Router();
v2Router.use('/users', userRoutesV2);

// app.ts
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);
```

**新方式:**
```typescript
@Controller('/v1/users')
export class UserControllerV1 {
  @Get('/')
  async list(req: Request, res: Response) {}
}

@Controller('/v2/users')
export class UserControllerV2 {
  @Get('/')
  async list(req: Request, res: Response) {}
}
```

## 迁移检查清单

- [ ] 安装并配置 `reflect-metadata`
- [ ] 在 `tsconfig.json` 中启用装饰器支持
- [ ] 在 `src/index.ts` 顶部导入 `reflect-metadata`
- [ ] 创建新的控制器文件
- [ ] 将路由逻辑迁移到装饰器
- [ ] 在 `src/controllers.ts` 中注册控制器
- [ ] 删除旧的路由文件
- [ ] 更新 `src/routes.ts`（如果需要）
- [ ] 测试所有路由
- [ ] 更新文档
- [ ] 删除旧代码

## 常见问题

### Q: 可以同时使用旧路由和新路由吗？

A: 可以。在迁移过程中，你可以保留旧的路由系统，逐步迁移到新系统。两种方式可以共存。

### Q: 如何处理复杂的中间件逻辑？

A: 复杂的中间件逻辑应该保持在独立的中间件文件中，然后通过 `@UseMiddleware` 装饰器应用。

### Q: 装饰器路由的性能如何？

A: 装饰器只在应用启动时执行一次，运行时性能与传统路由相同。

### Q: 如何调试装饰器路由？

A: 启动应用时，控制台会打印所有注册的路由。你也可以在装饰器代码中添加日志。

### Q: 可以动态注册路由吗？

A: 装饰器路由在编译时确定。如果需要动态路由，建议使用传统的 Express 路由方式。

## 回滚计划

如果迁移过程中遇到问题，可以快速回滚：

1. 恢复旧的路由文件
2. 在 `src/server.ts` 中注释掉装饰器路由导入
3. 恢复旧的 `setupRoutes` 实现
4. 重启应用

## 获取帮助

如果在迁移过程中遇到问题：

1. 查看 `docs/decorator-routing.md` 了解详细用法
2. 查看 `docs/router.decorator.md` 了解架构设计
3. 参考现有的控制器实现（如 `AuthController`）
4. 检查控制台日志中的路由注册信息

## 总结

装饰器路由系统提供了更加现代化和易于维护的路由管理方式。虽然需要一些学习成本，但长期来看会大大提高开发效率和代码质量。建议逐步迁移，先从简单的模块开始，积累经验后再迁移复杂模块。
