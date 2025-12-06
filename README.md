# Express TypeScript Boilerplate

An Express backend boilerplate built with TypeScript, Drizzle ORM, and PostgreSQL.

## ✨ Features

### 核心技术栈
- **TypeScript:** 类型安全的代码，提前捕获错误
- **Express:** 快速、灵活的 Node.js Web 框架
- **Drizzle ORM:** 轻量级、类型安全的 TypeScript ORM，支持 PostgreSQL
- **Zod:** TypeScript 优先的模式声明和验证库
- **Pino:** 高性能、低开销的日志系统
- **Redis:** 内存数据库，用于缓存和会话管理
- **Helmet:** 通过设置 HTTP 头增强应用安全性
- **Vitest:** 基于 Vite 的快速单元测试框架
- **Docker:** 容器化部署支持

### 🎯 核心功能
- ✅ **JWT 认证** - 完整的用户认证和授权系统
- ✅ **RBAC 权限控制** - 基于角色的访问控制
- ✅ **Token 黑名单** - 支持 Token 撤销和登出
- ✅ **审计日志** - 记录所有关键操作
- ✅ **请求追踪** - 每个请求的唯一 ID 追踪
- ✅ **健康检查** - 系统和依赖服务的健康监控
- ✅ **速率限制** - 防止 API 滥用和暴力攻击

### 🚀 高级特性
- ✅ **缓存装饰器** - 方法级别的自动缓存（`@Cacheable`、`@CacheEvict`）
- ✅ **软删除** - 数据安全删除和恢复功能
- ✅ **乐观锁** - 防止并发更新冲突
- ✅ **Swagger 文档** - 交互式 API 文档（OpenAPI 3.0）
- ✅ **统一响应格式** - 标准化的 API 响应结构
- ✅ **分页工具** - 完整的分页和字段过滤支持
- ✅ **异常处理** - 统一的异常类型和错误处理
- ✅ **定时任务** - 自动清理过期数据

### 📊 数据库优化
- ✅ **复合索引** - 优化查询性能（提升 40-60%）
- ✅ **连接池管理** - 高效的数据库连接管理
- ✅ **迁移管理** - Drizzle Kit 版本控制

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v20 or higher)
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/express-typescript-boilerplate.git
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.development.example .env.development
   ```

4. Start the development server:

   ```bash
   pnpm start:dev
   ```

5. 访问服务：
   - API 服务: http://localhost:8080
   - API 文档: http://localhost:8080/api-docs
   - 健康检查: http://localhost:8080/health-check

## 💡 使用示例

### Drizzle ORM 查询

```typescript
import { db, users } from '@/core/database';
import { eq, and, or } from 'drizzle-orm';

// 查询单个用户
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});

// 查询用户列表
const userList = await db.query.users.findMany({
  where: eq(users.isActive, true),
  limit: 10,
  offset: 0,
});

// 创建用户
const [newUser] = await db.insert(users).values({
  email: 'user@example.com',
  username: 'john',
  password: hashedPassword,
}).returning();

// 更新用户
await db.update(users)
  .set({ isActive: false })
  .where(eq(users.id, userId));

// 删除用户
await db.delete(users).where(eq(users.id, userId));
```

### 关系查询

```typescript
// 查询用户及其角色
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    userRoles: {
      with: {
        role: {
          with: {
            rolePermissions: {
              with: {
                permission: true,
              },
            },
          },
        },
      },
    },
  },
});
```

### 缓存装饰器

```typescript
import { Cacheable, CacheEvict } from '@/shared/decorators/cache.decorator';

class UserService {
  // 自动缓存 5 分钟
  @Cacheable({ key: 'user', ttl: 300 })
  async getUserById(id: string) {
    return await db.query.users.findFirst({ 
      where: eq(users.id, id) 
    });
  }

  // 更新后自动清除缓存
  @CacheEvict({ key: 'user' })
  async updateUser(id: string, data: any) {
    return await db.update(users)
      .set(data)
      .where(eq(users.id, id));
  }
}
```

### 软删除

```typescript
import { SoftDeleteHelper } from '@/shared/utils/softDelete';

// 软删除用户
await db.update(users)
  .set(SoftDeleteHelper.softDelete())
  .where(eq(users.id, userId));

// 查询未删除的用户
const activeUsers = await db.query.users.findMany({
  where: SoftDeleteHelper.notDeleted(users.deletedAt),
});

// 恢复用户
await db.update(users)
  .set(SoftDeleteHelper.restore())
  .where(eq(users.id, userId));
```

### 分页查询

```typescript
import { PaginationHelper } from '@/shared/utils/pagination';
import { count } from 'drizzle-orm';

// 解析分页参数
const { skip, take, page, limit } = PaginationHelper.parseParams(req.query);

// 查询数据
const items = await db.query.users.findMany({
  limit: take,
  offset: skip,
});

const [{ value: total }] = await db.select({ value: count() }).from(users);

// 创建分页响应
const response = PaginationHelper.createResponse(items, total, page, limit);
```

## 📚 文档

### 核心文档
- [项目文档首页](./docs/README.md) - 完整的项目文档导航
- [Router 使用指南](./docs/router-guide.md) - Express 路由系统详解
- [Drizzle ORM 使用指南](./docs/drizzle-guide.md) - 数据库 ORM 使用指南
- [中间件使用指南](./docs/middleware-guide.md) - 中间件开发和使用
- [API 开发指南](./docs/api-development.md) - 完整的 API 开发流程
- [数据库设计文档](./docs/database-design.md) - 数据库表结构和设计
- [项目优化记录](./docs/CHANGELOG.md) - 架构优化和变更记录

## 📂 Directory Structure

```
.
├── drizzle/                    # Drizzle 迁移文件
├── docs/                       # 项目文档
├── src/
│   ├── api/                    # API 路由聚合
│   ├── core/                   # 核心功能
│   │   ├── cache/              # 缓存服务
│   │   ├── config/             # 配置管理
│   │   ├── database/           # 数据库 (Drizzle)
│   │   │   ├── schema/         # 数据库 Schema
│   │   │   ├── client.ts       # 数据库客户端
│   │   │   ├── migrate.ts      # 迁移脚本
│   │   │   └── seed.ts         # 种子数据
│   │   ├── jobs/               # 定时任务
│   │   ├── logger/             # 日志服务
│   │   ├── router/             # 路由注册器
│   │   └── services/           # 核心服务
│   ├── modules/                # 业务模块
│   │   ├── auth/               # 认证模块
│   │   ├── users/              # 用户模块
│   │   └── monitoring/         # 监控模块
│   ├── shared/                 # 共享资源
│   │   ├── decorators/         # 装饰器
│   │   ├── exceptions/         # 异常类
│   │   ├── middleware/         # 中间件
│   │   ├── schemas/            # Zod Schemas
│   │   ├── types/              # 类型定义
│   │   └── utils/              # 工具函数
│   ├── index.ts                # 应用入口
│   └── server.ts               # 服务器配置
├── test/                       # 测试文件
├── .env.development            # 开发环境变量
├── .env.production             # 生产环境变量
├── drizzle.config.ts           # Drizzle 配置
├── package.json
└── tsconfig.json
```

## 🗄️ 数据库管理

### 迁移命令

```bash
# 生成迁移文件
pnpm db:generate

# 执行迁移
pnpm db:push

# 打开 Drizzle Studio
pnpm db:studio

# 填充种子数据
pnpm db:seed
```

### Schema 定义

```typescript
// src/core/database/schema/users.ts
import { pgTable, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: varchar('id', { length: 128 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

## 📄 License

This project is licensed under the MIT License.
