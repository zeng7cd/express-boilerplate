# 路由系统使用指南

本项目采用模块化的路由管理系统，提供了统一的路由注册和管理机制。

## 📋 目录

- [核心概念](#核心概念)
- [路由注册器](#路由注册器)
- [基本使用](#基本使用)
- [高级功能](#高级功能)
- [最佳实践](#最佳实践)

## 核心概念

### 路由层级结构

```
应用根路径
├── 系统路由（无前缀）
│   ├── /health-check          # 健康检查
│   └── /api-docs              # API 文档
└── 业务路由（/api 前缀）
    ├── /api/auth              # 认证模块
    ├── /api/users             # 用户模块
    └── /api/...               # 其他业务模块
```

### 路由配置文件

- `src/routes.ts` - 业务路由聚合
- `src/core/config/routes.ts` - 路由配置和注册
- `src/core/router/index.ts` - 路由注册器核心实现

## 路由注册器

### RouteRegistry 类

路由注册器采用单例模式，提供统一的路由管理功能。

```typescript
import { RouteRegistry } from '@/core/router';

// 获取路由注册器实例（默认前缀 /api）
const registry = RouteRegistry.getInstance();

// 自定义前缀
const customRegistry = RouteRegistry.getInstance('/v1');
```

### 核心方法

#### 1. register - 注册单个路由

```typescript
register(path: string, router: Router, description?: string): void
```

**参数：**
- `path` - 路由路径（相对于前缀）
- `router` - Express Router 实例
- `description` - 路由描述（可选）

**示例：**

```typescript
import { Router } from 'express';
import { routeRegistry } from '@/core/router';

const userRouter = Router();
userRouter.get('/', (req, res) => res.json({ message: 'User list' }));

// 注册路由：/api/users
routeRegistry.register('/users', userRouter, '用户管理');
```

#### 2. registerMultiple - 批量注册路由

```typescript
registerMultiple(configs: RouteConfig[]): void
```

**示例：**

```typescript
import { routeRegistry } from '@/core/router';
import authRouter from '@/modules/auth/routes';
import userRouter from '@/modules/users/routes';

routeRegistry.registerMultiple([
  { path: '/auth', router: authRouter, description: '认证模块' },
  { path: '/users', router: userRouter, description: '用户模块' },
]);
```

#### 3. getRouter - 获取主路由器

```typescript
getRouter(): Router
```

**示例：**

```typescript
import express from 'express';
import { routeRegistry } from '@/core/router';

const app = express();

// 将所有注册的路由挂载到应用
app.use('/api', routeRegistry.getRouter());
```

#### 4. getFullPath - 获取完整路径

```typescript
getFullPath(path: string): string
```

**示例：**

```typescript
import { routeRegistry } from '@/core/router';

const fullPath = routeRegistry.getFullPath('/users');
console.log(fullPath); // 输出: /api/users
```

#### 5. getRoutes - 获取已注册路由列表

```typescript
getRoutes(): RouteInfo[]
```

**返回类型：**

```typescript
interface RouteInfo {
  path: string;           // 相对路径
  fullPath: string;       // 完整路径
  description?: string;   // 路由描述
}
```

**示例：**

```typescript
import { routeRegistry } from '@/core/router';

const routes = routeRegistry.getRoutes();
routes.forEach(route => {
  console.log(`${route.fullPath} - ${route.description}`);
});
```

#### 6. printRoutes - 打印路由信息

```typescript
printRoutes(): void
```

在控制台打印所有已注册的路由信息，便于调试。

## 基本使用

### 1. 创建模块路由

在模块目录下创建 `routes.ts` 文件：

```typescript
// src/modules/products/routes.ts
import { Router } from 'express';
import { productController } from './controllers/product.controller';
import { authenticateJWT } from '@/shared/middleware/auth.middleware';

const router = Router();

// 公开路由
router.get('/', productController.list);
router.get('/:id', productController.getById);

// 需要认证的路由
router.post('/', authenticateJWT, productController.create);
router.put('/:id', authenticateJWT, productController.update);
router.delete('/:id', authenticateJWT, productController.delete);

export default router;
```

### 2. 注册模块路由

在 `src/routes.ts` 中注册：

```typescript
// src/routes.ts
import { Router } from 'express';
import authRoutes from '@/modules/auth/routes';
import productRoutes from '@/modules/products/routes';

const router = Router();

// 注册业务模块路由
router.use('/auth', authRoutes);
router.use('/products', productRoutes);

export default router;
```

### 3. 系统路由配置

对于不需要 `/api` 前缀的系统路由：

```typescript
// src/routes.ts
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
} as const;
```

## 高级功能

### 1. 路由分组

按功能对路由进行分组：

```typescript
// src/modules/admin/routes.ts
import { Router } from 'express';
import userManagementRoutes from './user-management/routes';
import systemSettingsRoutes from './system-settings/routes';

const router = Router();

// 管理员路由分组
router.use('/users', userManagementRoutes);
router.use('/settings', systemSettingsRoutes);

export default router;
```

```typescript
// src/routes.ts
import adminRoutes from '@/modules/admin/routes';

router.use('/admin', adminRoutes);
// 最终路径: /api/admin/users, /api/admin/settings
```

### 2. 版本化路由

支持 API 版本管理：

```typescript
// src/routes.ts
import v1Routes from '@/modules/v1/routes';
import v2Routes from '@/modules/v2/routes';

const router = Router();

router.use('/v1', v1Routes);
router.use('/v2', v2Routes);

export default router;
```

### 3. 路由中间件

为特定路由组添加中间件：

```typescript
import { Router } from 'express';
import { authenticateJWT } from '@/shared/middleware/auth.middleware';
import { requireRole } from '@/shared/middleware/role.middleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateJWT);

// 管理员路由需要特定角色
const adminRouter = Router();
adminRouter.use(requireRole('admin'));
adminRouter.get('/dashboard', adminController.dashboard);

router.use('/admin', adminRouter);

export default router;
```

### 4. 路由参数验证

使用 Zod 进行路由参数验证：

```typescript
import { Router } from 'express';
import { validate } from '@/shared/middleware/validation';
import { createProductSchema, updateProductSchema } from './schemas';

const router = Router();

router.post('/', 
  validate(createProductSchema), 
  productController.create
);

router.put('/:id', 
  validate(updateProductSchema), 
  productController.update
);

export default router;
```

### 5. 错误处理

路由级别的错误处理：

```typescript
import { Router } from 'express';
import { asyncHandler } from '@/shared/utils/asyncHandler';

const router = Router();

// 使用 asyncHandler 自动捕获异步错误
router.get('/:id', asyncHandler(async (req, res) => {
  const product = await productService.findById(req.params.id);
  if (!product) {
    throw new NotFoundException('Product not found');
  }
  res.json(product);
}));

export default router;
```

## 最佳实践

### 1. 路由命名规范

```typescript
// ✅ 推荐：使用复数名词
router.get('/products', ...)
router.get('/users', ...)

// ❌ 避免：使用动词
router.get('/getProducts', ...)
router.get('/fetchUsers', ...)
```

### 2. RESTful 设计

```typescript
const router = Router();

// 资源集合
router.get('/products', productController.list);          // 获取列表
router.post('/products', productController.create);       // 创建资源

// 单个资源
router.get('/products/:id', productController.getById);   // 获取详情
router.put('/products/:id', productController.update);    // 更新资源
router.patch('/products/:id', productController.patch);   // 部分更新
router.delete('/products/:id', productController.delete); // 删除资源

// 子资源
router.get('/products/:id/reviews', reviewController.list);
router.post('/products/:id/reviews', reviewController.create);
```

### 3. 路由组织结构

```
modules/
└── products/
    ├── controllers/
    │   └── product.controller.ts
    ├── services/
    │   └── product.service.ts
    ├── schemas/
    │   └── product.schema.ts
    ├── dtos/
    │   └── product.dto.ts
    └── routes.ts              # 路由定义
```

### 4. 路由文档注释

```typescript
/**
 * 产品管理路由
 * 
 * @route GET /api/products - 获取产品列表
 * @route GET /api/products/:id - 获取产品详情
 * @route POST /api/products - 创建产品（需要认证）
 * @route PUT /api/products/:id - 更新产品（需要认证）
 * @route DELETE /api/products/:id - 删除产品（需要管理员权限）
 */
const router = Router();
```

### 5. 路由测试

```typescript
// test/integration/products.test.ts
import request from 'supertest';
import { createApp } from '@/server';

describe('Product Routes', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  it('should get product list', async () => {
    const response = await request(app)
      .get('/api/products')
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });

  it('should create product with authentication', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Product', price: 99.99 })
      .expect(201);

    expect(response.body.data).toHaveProperty('id');
  });
});
```

### 6. 路由性能优化

```typescript
import { Router } from 'express';
import { cacheMiddleware } from '@/shared/middleware/cache';

const router = Router();

// 对频繁访问的只读接口添加缓存
router.get('/products', 
  cacheMiddleware({ ttl: 300 }), // 缓存5分钟
  productController.list
);

// 写操作不使用缓存
router.post('/products', productController.create);
```

## 常见问题

### Q: 如何修改 API 前缀？

A: 在 `.env` 文件中修改 `API_PREFIX` 变量：

```bash
API_PREFIX=v1  # 路径变为 /v1/auth, /v1/users
```

### Q: 如何添加全局路由中间件？

A: 在 `src/server.ts` 中添加：

```typescript
app.use(express.json());
app.use(cors());
app.use(yourGlobalMiddleware);  // 添加全局中间件
setupRoutes(app);
```

### Q: 如何处理 404 错误？

A: 在 `src/server.ts` 中已经配置了 404 处理器：

```typescript
// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: 'Resource not found',
  });
});
```

### Q: 如何查看所有注册的路由？

A: 启动应用时会自动打印路由信息，或者调用：

```typescript
import { routeRegistry } from '@/core/router';

routeRegistry.printRoutes();
```

## 相关文档

- [Express 路由文档](https://expressjs.com/en/guide/routing.html)
- [RESTful API 设计指南](https://restfulapi.net/)
- [JWT 认证使用指南](./jwt.md)
