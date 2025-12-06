# Express Router 使用指南

本文档介绍项目中 Express Router 的使用方法和最佳实践。

## 目录结构

```
src/
├── core/
│   └── router/           # 路由注册器
│       └── index.ts
├── modules/
│   └── [module]/
│       └── routes.ts     # 模块路由定义
└── api/
    └── routes.ts         # 路由聚合
```

## 基础用法

### 1. 创建模块路由

在模块目录下创建 `routes.ts` 文件：

```typescript
// src/modules/auth/routes.ts
import { Router } from 'express';
import { authController } from './controllers/auth.controller';
import { authenticateJWT } from '@/shared/middleware/auth.middleware';

const router = Router();

// 公开路由
router.post('/register', authController.register);
router.post('/login', authController.login);

// 需要认证的路由
router.post('/logout', authenticateJWT, authController.logout);
router.get('/me', authenticateJWT, authController.me);

export default router;
```

### 2. 注册路由

在 `src/api/routes.ts` 中聚合所有模块路由：

```typescript
import { Router } from 'express';
import authRoutes from '@/modules/auth/routes';
import userRoutes from '@/modules/users/routes';

const router = Router();

// 注册模块路由
router.use('/auth', authRoutes);      // /api/auth/*
router.use('/users', userRoutes);     // /api/users/*

export default router;
```

### 3. 系统路由

系统路由（如健康检查、文档）不需要 `/api` 前缀：

```typescript
// src/api/routes.ts
export const systemRoutes = {
  healthCheck: {
    path: '/health-check',
    router: healthCheckRouter,
    description: '系统健康检查',
  },
  swagger: {
    path: '/api-docs',
    router: swaggerRoutes,
    description: 'API 文档',
  },
};
```

## 路由注册器

### 使用路由注册器

```typescript
import { routeRegistry, registerRoute } from '@/core/router';

// 注册单个路由
registerRoute('/auth', authRouter, '认证模块');

// 批量注册
routeRegistry.registerMultiple([
  { path: '/auth', router: authRouter, description: '认证模块' },
  { path: '/users', router: userRouter, description: '用户管理' },
]);

// 获取完整路径
const fullPath = routeRegistry.getFullPath('/auth'); // /api/auth

// 打印所有路由
routeRegistry.printRoutes();
```

## 中间件使用

### 路由级中间件

```typescript
// 单个路由使用中间件
router.get('/profile', authenticateJWT, userController.getProfile);

// 多个中间件
router.post(
  '/admin/users',
  authenticateJWT,
  requireRoles(['admin']),
  userController.createUser
);

// 路由组使用中间件
const protectedRouter = Router();
protectedRouter.use(authenticateJWT);
protectedRouter.get('/profile', userController.getProfile);
protectedRouter.put('/profile', userController.updateProfile);
```

### 常用中间件

```typescript
import { authenticateJWT, requireRoles, requirePermissions } from '@/shared/middleware/auth.middleware';

// JWT 认证
router.use(authenticateJWT);

// 角色验证
router.use(requireRoles(['admin', 'moderator']));

// 权限验证
router.use(requirePermissions(['users:read', 'users:write']));
```

## 路由组织最佳实践

### 1. 按功能模块组织

```
src/modules/
├── auth/
│   ├── routes.ts
│   ├── controllers/
│   └── services/
├── users/
│   ├── routes.ts
│   ├── controllers/
│   └── services/
└── posts/
    ├── routes.ts
    ├── controllers/
    └── services/
```

### 2. RESTful 路由设计

```typescript
const router = Router();

// 资源路由
router.get('/', controller.list);           // GET /api/users
router.post('/', controller.create);        // POST /api/users
router.get('/:id', controller.getById);     // GET /api/users/:id
router.put('/:id', controller.update);      // PUT /api/users/:id
router.delete('/:id', controller.delete);   // DELETE /api/users/:id

// 子资源路由
router.get('/:id/posts', controller.getUserPosts);  // GET /api/users/:id/posts
```

### 3. 版本控制

```typescript
// src/api/routes.ts
import v1Routes from './v1/routes';
import v2Routes from './v2/routes';

const router = Router();

router.use('/v1', v1Routes);  // /api/v1/*
router.use('/v2', v2Routes);  // /api/v2/*

export default router;
```

## 路由参数

### 路径参数

```typescript
// 定义
router.get('/users/:id', controller.getUser);
router.get('/posts/:postId/comments/:commentId', controller.getComment);

// 使用
const userId = req.params.id;
const { postId, commentId } = req.params;
```

### 查询参数

```typescript
// GET /api/users?page=1&limit=10&sort=createdAt
router.get('/users', (req, res) => {
  const { page = 1, limit = 10, sort = 'createdAt' } = req.query;
  // 处理逻辑
});
```

### 请求体

```typescript
// POST /api/users
router.post('/users', (req, res) => {
  const { email, username, password } = req.body;
  // 处理逻辑
});
```

## 错误处理

### 路由级错误处理

```typescript
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await userService.findById(req.params.id);
    res.json(user);
  } catch (error) {
    next(error); // 传递给全局错误处理器
  }
});
```

### 使用 async/await

```typescript
import { asyncHandler } from '@/shared/utils/asyncHandler';

router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  res.json(user);
}));
```

## 响应格式

### 统一响应格式

```typescript
import { ServiceResponse } from '@/shared/utils/serviceResponse';

router.get('/users/:id', async (req, res) => {
  const user = await userService.findById(req.params.id);
  const response = ServiceResponse.success('User retrieved', user);
  res.status(response.statusCode).json(response);
});
```

## 调试技巧

### 打印所有路由

```typescript
import { routeRegistry } from '@/core/router';

// 在应用启动后
routeRegistry.printRoutes();
```

### 路由日志

```typescript
router.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

## 常见问题

### 1. 路由顺序很重要

```typescript
// ❌ 错误：通配符路由在前
router.get('/:id', controller.getById);
router.get('/me', controller.getMe);  // 永远不会匹配

// ✅ 正确：具体路由在前
router.get('/me', controller.getMe);
router.get('/:id', controller.getById);
```

### 2. 中间件执行顺序

```typescript
// 中间件按注册顺序执行
router.use(middleware1);  // 先执行
router.use(middleware2);  // 后执行
router.get('/', handler); // 最后执行
```

### 3. 路由前缀

```typescript
// 所有业务路由自动添加 /api 前缀
// 在 src/core/config/routes.ts 中配置
app.use('/api', apiRoutes);
```

## 相关文档

- [Prisma 使用指南](./prisma-guide.md)
- [中间件开发指南](./middleware-guide.md)
- [API 设计规范](./api-design.md)
