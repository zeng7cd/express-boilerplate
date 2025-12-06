# Express TypeScript Boilerplate

An Express backend boilerplate built with TypeScript, Drizzle ORM, and PostgreSQL.

## ✨ Features

### 核心技术栈
- **TypeScript:** 类型安全的代码，提前捕获错误
- **Express:** 快速、灵活的 Node.js Web 框架
- **Prisma ORM:** 现代化的 TypeScript ORM，支持 PostgreSQL
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
- ✅ **迁移管理** - Prisma Migrate 版本控制

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

### 缓存装饰器

```typescript
import { Cacheable, CacheEvict } from '@/shared/decorators/cache.decorator';

class UserService {
  // 自动缓存 5 分钟
  @Cacheable({ key: 'user', ttl: 300 })
  async getUserById(id: string) {
    return await prisma.user.findUnique({ where: { id } });
  }

  // 更新后自动清除缓存
  @CacheEvict({ key: 'user' })
  async updateUser(id: string, data: any) {
    return await prisma.user.update({ where: { id }, data });
  }
}
```

### 软删除

```typescript
import { SoftDeleteHelper } from '@/shared/utils/softDelete';

// 软删除用户
await prisma.user.update({
  where: { id },
  data: SoftDeleteHelper.softDelete(),
});

// 查询未删除的用户
const users = await prisma.user.findMany({
  where: SoftDeleteHelper.notDeleted(),
});

// 恢复用户
await prisma.user.update({
  where: { id },
  data: SoftDeleteHelper.restore(),
});
```

### 乐观锁

```typescript
import { OptimisticLockHelper } from '@/shared/utils/softDelete';

// 使用版本号防止并发冲突
const result = await prisma.user.updateMany({
  where: OptimisticLockHelper.createLockCondition(id, currentVersion),
  data: OptimisticLockHelper.incrementVersion(updateData),
});

if (result.count === 0) {
  throw new OptimisticLockException('数据已被其他用户修改');
}
```

### 分页查询

```typescript
import { PaginationHelper } from '@/shared/utils/pagination';

// 解析分页参数
const { skip, take, page, limit } = PaginationHelper.parseParams(req.query);

// 查询数据
const [items, total] = await Promise.all([
  prisma.user.findMany({ skip, take }),
  prisma.user.count(),
]);

// 创建分页响应
const response = PaginationHelper.createResponse(items, total, page, limit);
```

## 📚 文档

- [快速启动指南](./QUICK_START.md)
- [路由系统文档](./docs/ROUTING.md)
- [缓存使用指南](./docs/CACHE_USAGE.md)
- [软删除和乐观锁使用指南](./docs/SOFT_DELETE_USAGE.md)
- [API 文档指南](./docs/API_DOCUMENTATION.md)
- [优化完成报告](./OPTIMIZATION_COMPLETED.md)

## 📂 Directory Structure

```
.
├── deploy
├── docs
├── src
│   ├── api
│   ├── cache
│   ├── common
│   ├── config
│   ├── database
│   ├── middleware
│   ├── utils
│   ├── index.ts
│   └── server.ts
├── test
├── .env.development
├── .env.production
├── package.json
└── tsconfig.json
```

## 📄 License

This project is licensed under the MIT License.
