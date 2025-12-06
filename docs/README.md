# 项目文档

欢迎查看项目文档！本文档提供了项目的完整使用指南和最佳实践。

## 📚 文档目录

### 核心指南

1. **[Router 使用指南](./router-guide.md)**
   - Express Router 基础用法
   - 路由注册器使用
   - 中间件集成
   - RESTful 设计规范

2. **[Drizzle ORM 使用指南](./drizzle-guide.md)**
   - 数据库模型定义
   - CRUD 操作
   - 关系查询
   - 事务处理
   - 最佳实践

3. **[中间件使用指南](./middleware-guide.md)**
   - 内置中间件说明
   - 认证授权中间件
   - 自定义中间件开发
   - 中间件执行顺序

4. **[API 开发指南](./api-development.md)**
   - 创建新模块流程
   - 分层架构设计
   - 错误处理规范
   - 测试编写

## 🏗️ 项目架构

### 目录结构

```
express-boilerplate/
├── src/
│   ├── api/                    # API 路由聚合
│   │   └── routes.ts
│   ├── core/                   # 核心功能模块
│   │   ├── cache/              # 缓存服务 (Redis)
│   │   ├── config/             # 配置管理
│   │   ├── database/           # 数据库连接 (Drizzle)
│   │   ├── jobs/               # 定时任务
│   │   ├── logger/             # 日志服务 (Pino)
│   │   ├── router/             # 路由注册器 ⭐ 新增
│   │   ├── services/           # 核心服务
│   │   └── index.ts
│   ├── modules/                # 业务模块
│   │   ├── auth/               # 认证模块
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   └── routes.ts
│   │   ├── users/              # 用户模块
│   │   └── monitoring/         # 监控模块
│   ├── shared/                 # 共享资源
│   │   ├── middleware/         # 中间件
│   │   ├── utils/              # 工具函数
│   │   └── types/              # 类型定义
│   ├── generated/              # 生成的代码
│   │   └── prisma/             # Prisma Client
│   ├── index.ts                # 应用入口
│   └── server.ts               # 服务器配置
├── prisma/
│   ├── schema.prisma           # 数据库模型
│   └── seed.ts                 # 种子数据
├── test/                       # 测试文件
│   ├── unit/                   # 单元测试
│   └── integration/            # 集成测试
└── docs/                       # 项目文档 📖
    ├── README.md
    ├── router-guide.md
    ├── drizzle-guide.md
    ├── middleware-guide.md
    └── api-development.md
```

### 技术栈

- **运行时**: Node.js + TypeScript
- **框架**: Express 5
- **数据库**: PostgreSQL + Drizzle ORM
- **缓存**: Redis (ioredis)
- **认证**: JWT (jsonwebtoken)
- **日志**: Pino
- **验证**: Zod
- **测试**: Vitest + Supertest
- **代码质量**: ESLint + Prettier

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并配置：

```bash
cp .env.example .env
```

### 3. 初始化数据库

```bash
# 生成 Prisma Client
pnpm db:generate

# 运行数据库迁移
pnpm db:migrate

# 填充种子数据
pnpm db:seed
```

### 4. 启动开发服务器

```bash
pnpm start:dev
```

服务器将在 `http://localhost:3000` 启动。

## 📋 常用命令

### 开发

```bash
pnpm start:dev          # 启动开发服务器（热重载）
pnpm build              # 构建生产版本
pnpm start:prod         # 启动生产服务器
```

### 数据库

```bash
pnpm db:generate        # 生成 Prisma Client
pnpm db:push            # 推送 schema 到数据库（开发）
pnpm db:migrate         # 创建并运行迁移
pnpm db:migrate:prod    # 部署迁移（生产）
pnpm db:studio          # 打开 Prisma Studio
pnpm db:seed            # 运行种子数据
```

### 代码质量

```bash
pnpm lint               # 运行 ESLint 并自动修复
pnpm lint:check         # 检查代码规范
pnpm format             # 格式化代码
pnpm type-check         # TypeScript 类型检查
pnpm validate           # 运行所有检查（类型+lint+测试）
```

### 测试

```bash
pnpm test               # 运行测试
pnpm test:cov           # 运行测试并生成覆盖率报告
```

## 🔧 核心功能

### 路由注册器

项目使用统一的路由注册器管理所有路由：

```typescript
import { routeRegistry, registerRoute } from '@/core/router';

// 注册路由
registerRoute('/auth', authRouter, '认证模块');

// 获取完整路径
const fullPath = routeRegistry.getFullPath('/auth'); // /api/auth

// 打印所有路由
routeRegistry.printRoutes();
```

详见：[Router 使用指南](./router-guide.md)

### 数据库访问

使用 Drizzle ORM 进行类型安全的数据库操作：

```typescript
import { db, users } from '@/core/database';
import { eq } from 'drizzle-orm';

// 查询
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});

// 创建
const [newUser] = await db.insert(users).values({
  email, username, password
}).returning();
```

详见：[Drizzle ORM 使用指南](./drizzle-guide.md)

### 认证授权

使用 JWT 进行身份认证：

```typescript
import { authenticateJWT, requireRoles } from '@/shared/middleware/auth.middleware';

// 保护路由
router.get('/profile', authenticateJWT, controller.getProfile);

// 角色验证
router.delete('/users/:id', authenticateJWT, requireRoles(['admin']), controller.delete);
```

详见：[中间件使用指南](./middleware-guide.md)

### 缓存服务

使用 Redis 进行数据缓存：

```typescript
import { cacheService } from '@/core/cache';

// 设置缓存
await cacheService.set('key', value, 3600);

// 获取缓存
const value = await cacheService.get('key');

// 删除缓存
await cacheService.del('key');
```

### 日志服务

使用 Pino 进行结构化日志：

```typescript
import { getAppPinoLogger } from '@/core/logger';

const logger = getAppPinoLogger();

logger.info('User logged in', { userId });
logger.error('Failed to process request', { error });
```

## 📐 架构设计

### 分层架构

```
┌─────────────────────────────────────┐
│         Controller Layer            │  HTTP 请求/响应处理
│  (处理请求、验证、响应格式化)          │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│          Service Layer              │  业务逻辑
│  (业务规则、数据处理、事务管理)        │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│        Repository Layer             │  数据访问
│  (数据库操作、查询封装)               │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│         Database (Prisma)           │  数据持久化
└─────────────────────────────────────┘
```

### 模块化设计

每个业务模块独立管理：

```
modules/[module]/
├── routes.ts           # 路由定义
├── controllers/        # 控制器
├── services/           # 业务逻辑
├── repositories/       # 数据访问
├── dto/                # 数据传输对象
└── types/              # 类型定义
```

## 🔒 安全特性

- ✅ JWT 认证
- ✅ 基于角色的访问控制 (RBAC)
- ✅ 基于权限的访问控制
- ✅ 请求限流
- ✅ Helmet 安全头
- ✅ CORS 配置
- ✅ 输入验证 (Zod)
- ✅ SQL 注入防护 (Prisma)
- ✅ Token 黑名单
- ✅ 密码加密 (bcrypt)

## 📊 监控功能

- ✅ 健康检查端点 (`/health-check`)
- ✅ 详细健康检查 (`/health-check/detailed`)
- ✅ Prometheus 指标 (`/metrics`)
- ✅ API 文档 (`/api-docs`)
- ✅ 请求日志
- ✅ 错误追踪

## 🎯 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化
- 编写清晰的注释

### 命名规范

- 文件名：kebab-case (`user-service.ts`)
- 类名：PascalCase (`UserService`)
- 函数/变量：camelCase (`getUserById`)
- 常量：UPPER_SNAKE_CASE (`API_PREFIX`)
- 接口：PascalCase + I 前缀 (`IUser`) 或不加前缀

### Git 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

## 🧪 测试策略

### 单元测试

测试独立的函数和类：

```typescript
describe('UserService', () => {
  it('should create a user', async () => {
    const user = await userService.create(userData);
    expect(user).toHaveProperty('id');
  });
});
```

### 集成测试

测试 API 端点：

```typescript
describe('POST /api/users', () => {
  it('should create a user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send(userData);
    expect(res.status).toBe(201);
  });
});
```

## 📦 部署

### Docker 部署

```bash
# 构建镜像
docker build -t express-app .

# 运行容器
docker-compose up -d
```

### 环境变量

确保在生产环境配置以下变量：

- `NODE_ENV=production`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📝 更新日志

### v0.0.1 (当前版本)

- ✅ 基础项目架构
- ✅ 用户认证系统
- ✅ RBAC 权限系统
- ✅ 健康检查和监控
- ✅ 完整的文档体系
- ✅ 路由注册器优化

## 📞 支持

如有问题或建议，请：

1. 查看相关文档
2. 搜索已有 Issues
3. 创建新的 Issue

## 📄 许可证

本项目采用 MIT 许可证。

---

**Happy Coding! 🚀**
