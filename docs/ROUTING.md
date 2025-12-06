# 路由系统说明

## 📋 路由架构

项目采用**清晰的两层路由架构**：

```
应用根路径
├── 系统路由（无前缀）
│   └── /health-check          - 健康检查
│
└── API 路由（/api 前缀）
    ├── /api/auth              - 认证相关
    ├── /api/users             - 用户管理
    └── /api/...               - 其他业务模块
```

## 🎯 设计原则

### 1. 路由分类

#### 系统路由（System Routes）
- **特点**: 不添加 `/api` 前缀
- **用途**: 健康检查、监控、指标等基础设施接口
- **原因**: 便于负载均衡器、监控系统直接访问

#### 业务路由（API Routes）
- **特点**: 统一添加 `/api` 前缀
- **用途**: 所有业务功能接口
- **原因**: 便于版本控制、统一管理

### 2. 统一注册

所有路由在 `src/api/routes.ts` 中统一注册，避免：
- ❌ 副作用导入（`import '@/modules/...'`）
- ❌ 自动注册机制（`registerRoute()`）
- ❌ 多处注册导致混乱

## 📝 如何添加新路由

### 步骤 1: 创建路由模块

```typescript
// src/modules/users/routes.ts
import { Router } from 'express';
import { userController } from './controllers/user.controller';
import { authenticateJWT } from '@/shared/middleware/auth.middleware';

const router = Router();

// 公开路由
router.get('/', userController.list);
router.get('/:id', userController.getById);

// 需要认证的路由
router.post('/', authenticateJWT, userController.create);
router.put('/:id', authenticateJWT, userController.update);
router.delete('/:id', authenticateJWT, userController.delete);

export default router;
```

### 步骤 2: 在 routes.ts 中注册

#### 业务路由（带 /api 前缀）

```typescript
// src/api/routes.ts
import { Router } from 'express';
import authRoutes from '@/modules/auth/routes';
import userRoutes from '@/modules/users/routes';  // 新增

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);  // 新增

export default router;
```

访问路径: `http://localhost:8080/api/users`

#### 系统路由（无前缀）

```typescript
// src/api/routes.ts
import { metricsRouter } from '@/modules/monitoring/metrics.routes';

export const systemRoutes = {
  healthCheck: {
    path: '/health-check',
    router: healthCheckRouter,
    description: '系统健康检查',
  },
  metrics: {  // 新增
    path: '/metrics',
    router: metricsRouter,
    description: 'Prometheus 指标',
  },
};
```

访问路径: `http://localhost:8080/metrics`

### 步骤 3: 更新路由文档

在 `src/core/config/routes.ts` 的 `printRouteConfiguration()` 函数中添加说明：

```typescript
console.log(`  ${ROUTE_CONFIG.API_PREFIX}/users              - 用户管理接口`);
```

## 🔍 路由配置文件说明

### src/api/routes.ts
**职责**: 路由聚合中心
- 导入所有业务模块路由
- 定义系统路由
- 统一导出

### src/core/config/routes.ts
**职责**: 路由注册和配置
- 注册系统路由（无前缀）
- 注册 API 路由（带前缀）
- 打印路由配置信息

### src/modules/*/routes.ts
**职责**: 模块路由定义
- 定义模块内的所有路由
- 配置中间件
- 导出 Router 实例

## 📊 路由示例

### 完整示例：用户模块

```typescript
// 1. 创建控制器
// src/modules/users/controllers/user.controller.ts
export class UserController {
  async list(req: Request, res: Response) {
    // 实现列表查询
  }
  
  async getById(req: Request, res: Response) {
    // 实现详情查询
  }
  
  async create(req: Request, res: Response) {
    // 实现创建
  }
  
  async update(req: Request, res: Response) {
    // 实现更新
  }
  
  async delete(req: Request, res: Response) {
    // 实现删除
  }
}

export const userController = new UserController();
```

```typescript
// 2. 创建路由
// src/modules/users/routes.ts
import { Router } from 'express';
import { userController } from './controllers/user.controller';
import { authenticateJWT, requirePermissions } from '@/shared/middleware/auth.middleware';
import { validateRequest } from '@/shared/middleware/validation';
import { createUserSchema, updateUserSchema } from './schemas/user.schema';

const router = Router();

// 列表查询（需要认证）
router.get(
  '/',
  authenticateJWT,
  userController.list
);

// 详情查询（需要认证）
router.get(
  '/:id',
  authenticateJWT,
  userController.getById
);

// 创建用户（需要认证 + 权限）
router.post(
  '/',
  authenticateJWT,
  requirePermissions(['user:create']),
  validateRequest(createUserSchema),
  userController.create
);

// 更新用户（需要认证 + 权限）
router.put(
  '/:id',
  authenticateJWT,
  requirePermissions(['user:update']),
  validateRequest(updateUserSchema),
  userController.update
);

// 删除用户（需要认证 + 权限）
router.delete(
  '/:id',
  authenticateJWT,
  requirePermissions(['user:delete']),
  userController.delete
);

export default router;
```

```typescript
// 3. 注册路由
// src/api/routes.ts
import userRoutes from '@/modules/users/routes';

router.use('/users', userRoutes);
```

## 🎨 路由命名规范

### RESTful 风格

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 列表 | GET | `/users` | 获取用户列表 |
| 详情 | GET | `/users/:id` | 获取单个用户 |
| 创建 | POST | `/users` | 创建用户 |
| 更新 | PUT | `/users/:id` | 更新用户 |
| 部分更新 | PATCH | `/users/:id` | 部分更新用户 |
| 删除 | DELETE | `/users/:id` | 删除用户 |

### 嵌套资源

```typescript
// 用户的角色
GET    /users/:userId/roles
POST   /users/:userId/roles
DELETE /users/:userId/roles/:roleId

// 用户的权限
GET    /users/:userId/permissions
```

### 特殊操作

```typescript
// 使用动词表示特殊操作
POST   /users/:id/activate      - 激活用户
POST   /users/:id/deactivate    - 停用用户
POST   /users/:id/reset-password - 重置密码
POST   /auth/refresh            - 刷新 token
POST   /auth/logout             - 登出
```

## 🔐 路由保护

### 认证中间件

```typescript
import { authenticateJWT } from '@/shared/middleware/auth.middleware';

// 需要登录
router.get('/profile', authenticateJWT, controller.getProfile);
```

### 权限中间件

```typescript
import { requirePermissions } from '@/shared/middleware/auth.middleware';

// 需要特定权限
router.post(
  '/users',
  authenticateJWT,
  requirePermissions(['user:create']),
  controller.create
);
```

### 角色中间件

```typescript
import { requireRoles } from '@/shared/middleware/auth.middleware';

// 需要特定角色
router.delete(
  '/users/:id',
  authenticateJWT,
  requireRoles(['admin']),
  controller.delete
);
```

### 组合使用

```typescript
// 需要登录 + 特定角色 + 特定权限
router.post(
  '/admin/settings',
  authenticateJWT,
  requireRoles(['admin']),
  requirePermissions(['settings:write']),
  controller.updateSettings
);
```

## 📦 路由分组

### 按版本分组

```typescript
// src/api/routes.ts
import v1Routes from './v1/routes';
import v2Routes from './v2/routes';

const router = Router();

router.use('/v1', v1Routes);
router.use('/v2', v2Routes);

export default router;
```

访问路径:
- `http://localhost:8080/api/v1/users`
- `http://localhost:8080/api/v2/users`

### 按功能分组

```typescript
// src/api/routes.ts
import authRoutes from '@/modules/auth/routes';
import userRoutes from '@/modules/users/routes';
import roleRoutes from '@/modules/roles/routes';

const router = Router();

// 认证相关
router.use('/auth', authRoutes);

// 用户管理
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);

export default router;
```

## 🛠️ 调试路由

### 查看所有路由

启动应用时会自动打印路由配置：

```
📋 Route Configuration:
============================================================

🔧 System Routes (no prefix):
  /health-check                  - 系统健康检查

🌐 API Routes (prefix: /api):
  /api/auth                      - 认证相关接口
  /api/users                     - 用户管理接口

============================================================
```

### 使用 Express 路由调试

```typescript
// 开发环境打印所有路由
if (env.isDevelopment) {
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      console.log(middleware.route);
    }
  });
}
```

## ⚠️ 常见问题

### 1. 路由冲突

**问题**: 两个路由路径相同

```typescript
router.get('/users/:id', ...);
router.get('/users/me', ...);  // 永远不会匹配
```

**解决**: 将更具体的路由放在前面

```typescript
router.get('/users/me', ...);   // 先匹配
router.get('/users/:id', ...);  // 后匹配
```

### 2. 中间件顺序

**问题**: 中间件顺序错误导致功能失效

```typescript
// ❌ 错误：验证在认证之前
router.post('/', validateRequest(schema), authenticateJWT, controller.create);

// ✅ 正确：先认证，再验证
router.post('/', authenticateJWT, validateRequest(schema), controller.create);
```

### 3. 路径参数

**问题**: 路径参数命名不一致

```typescript
// ❌ 不一致
router.get('/users/:userId', ...);
router.get('/users/:id/posts', ...);

// ✅ 一致
router.get('/users/:userId', ...);
router.get('/users/:userId/posts', ...);
```

## 📚 相关文档

- [Express 路由文档](https://expressjs.com/en/guide/routing.html)
- [RESTful API 设计指南](https://restfulapi.net/)
- [API 安全最佳实践](https://owasp.org/www-project-api-security/)

---

**最后更新**: 2025年12月5日
