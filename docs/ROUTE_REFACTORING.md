# 路由系统重构说明

## 🎯 重构目标

解决原有路由注册机制混乱的问题，建立清晰、可维护的路由架构。

## ❌ 原有问题

### 1. 混乱的注册方式

```typescript
// 问题 1: 副作用导入
import '@/modules/monitoring/healthCheck/healthCheck.routes';

// 问题 2: 手动导入
import authRoutes from '@/modules/auth/routes';

// 问题 3: 自动注册机制
registerRoute('/health-check', healthCheckRouter, '系统健康检查');

// 问题 4: 多处注册
app.use(ROUTE_CONFIG.API_PREFIX, apiRoutes);
app.use(ROUTE_CONFIG.API_PREFIX, routeRegistry.getRouter());
```

### 2. 难以追踪

- 副作用导入使得路由注册时机不明确
- 自动注册机制隐藏了路由的实际注册位置
- 多处注册导致路由冲突风险

### 3. 维护困难

- 新增路由时不知道该用哪种方式
- 路由配置分散在多个文件
- 缺少统一的路由文档

## ✅ 重构方案

### 1. 清晰的两层架构

```
应用根路径
├── 系统路由（无前缀）
│   └── /health-check          - 健康检查
│   └── /metrics               - 监控指标
│
└── API 路由（/api 前缀）
    ├── /api/auth              - 认证相关
    ├── /api/users             - 用户管理
    └── /api/...               - 其他业务模块
```

### 2. 统一注册中心

**src/api/routes.ts** - 所有路由的唯一注册点

```typescript
import { Router, type Router as ExpressRouter } from 'express';
import authRoutes from '@/modules/auth/routes';
import { healthCheckRouter } from '@/modules/monitoring/healthCheck/healthCheck.routes';

const router: ExpressRouter = Router();

/**
 * 业务模块路由
 * 这些路由会自动添加 /api 前缀
 */
router.use('/auth', authRoutes);

/**
 * 系统路由（不添加 /api 前缀）
 * 直接在 setupRoutes 中注册
 */
export const systemRoutes = {
  healthCheck: {
    path: '/health-check',
    router: healthCheckRouter,
    description: '系统健康检查',
  },
};

export default router;
```

### 3. 简化的注册流程

**src/core/config/routes.ts**

```typescript
export default function setupRoutes(app: Application): void {
  // 1. 注册系统路由（不带 API 前缀）
  registerSystemRoutes(app);

  // 2. 注册业务 API 路由（带 API 前缀）
  registerApiRoutes(app);

  // 3. 打印路由配置信息
  printRouteConfiguration();
}
```

## 📊 对比

| 方面 | 重构前 | 重构后 |
|------|--------|--------|
| **注册方式** | 3种混用 | 1种统一 |
| **注册位置** | 分散多处 | 集中管理 |
| **可追踪性** | 困难 | 清晰 |
| **可维护性** | 低 | 高 |
| **文档完整性** | 无 | 完整 |

## 🔄 迁移指南

### 如果你有现有的路由模块

#### 步骤 1: 移除自动注册

```typescript
// ❌ 删除这种代码
import { registerRoute } from '@/shared/utils/routeRegistry';
registerRoute('/my-route', myRouter, 'description');
```

#### 步骤 2: 导出路由

```typescript
// ✅ 只需导出 router
export const myRouter = Router();
// 或
export default router;
```

#### 步骤 3: 在 routes.ts 中注册

```typescript
// src/api/routes.ts
import myRoutes from '@/modules/my-module/routes';

// 业务路由
router.use('/my-module', myRoutes);

// 或系统路由
export const systemRoutes = {
  myRoute: {
    path: '/my-route',
    router: myRouter,
    description: '我的路由',
  },
};
```

## 📝 新增路由示例

### 业务路由（带 /api 前缀）

```typescript
// 1. 创建路由模块
// src/modules/products/routes.ts
import { Router } from 'express';
import { productController } from './controllers/product.controller';

const router = Router();

router.get('/', productController.list);
router.get('/:id', productController.getById);
router.post('/', productController.create);

export default router;

// 2. 注册路由
// src/api/routes.ts
import productRoutes from '@/modules/products/routes';
router.use('/products', productRoutes);
```

访问: `http://localhost:8080/api/products`

### 系统路由（无前缀）

```typescript
// 1. 创建路由模块
// src/modules/monitoring/metrics.routes.ts
import { Router } from 'express';

export const metricsRouter = Router();

metricsRouter.get('/', (req, res) => {
  // 返回 Prometheus 格式的指标
});

// 2. 注册路由
// src/api/routes.ts
import { metricsRouter } from '@/modules/monitoring/metrics.routes';

export const systemRoutes = {
  metrics: {
    path: '/metrics',
    router: metricsRouter,
    description: 'Prometheus 指标',
  },
};
```

访问: `http://localhost:8080/metrics`

## 🎨 最佳实践

### 1. 路由模块结构

```
src/modules/users/
├── controllers/
│   └── user.controller.ts
├── services/
│   └── user.service.ts
├── schemas/
│   └── user.schema.ts
├── dtos/
│   └── user.dto.ts
└── routes.ts              # 路由定义
```

### 2. 路由定义模板

```typescript
import { Router } from 'express';
import { controller } from './controllers/xxx.controller';
import { authenticateJWT } from '@/shared/middleware/auth.middleware';
import { validateRequest } from '@/shared/middleware/validation';
import { schema } from './schemas/xxx.schema';

const router = Router();

// 公开路由
router.get('/', controller.list);

// 需要认证的路由
router.post(
  '/',
  authenticateJWT,
  validateRequest(schema),
  controller.create
);

export default router;
```

### 3. 中间件顺序

```typescript
router.post(
  '/',
  authenticateJWT,           // 1. 认证
  requirePermissions([...]), // 2. 权限检查
  validateRequest(schema),   // 3. 输入验证
  controller.create          // 4. 业务逻辑
);
```

## 🔍 调试和测试

### 查看路由配置

启动应用时会自动打印：

```
📋 Route Configuration:
============================================================

🔧 System Routes (no prefix):
  /health-check                  - 系统健康检查

🌐 API Routes (prefix: /api):
  /api/auth                      - 认证相关接口

============================================================
```

### 测试路由

```bash
# 系统路由
curl http://localhost:8080/health-check

# API 路由
curl http://localhost:8080/api/auth/login
```

## 📚 相关文档

- [路由系统完整文档](./ROUTING.md)
- [快速开始指南](../QUICK_START.md)
- [项目审查报告](../项目审查报告.md)

## ✨ 优化效果

- ✅ **清晰**: 一眼就能看出所有路由的注册位置
- ✅ **统一**: 只有一种路由注册方式
- ✅ **可维护**: 新增路由只需在一个地方修改
- ✅ **可追踪**: 没有副作用导入和隐式注册
- ✅ **有文档**: 完整的路由系统文档

---

**重构完成日期**: 2025年12月5日  
**影响文件**: 4个核心文件  
**新增文档**: 2个文档文件
