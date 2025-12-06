# Prisma 到 Drizzle 迁移指南

本文档记录了从 Prisma ORM 迁移到 Drizzle ORM 的完整过程和使用方法。

## 迁移原因

- **更好的 TypeScript 支持**：Drizzle 提供完全类型安全的查询
- **更轻量**：无需生成大量代码，运行时更小
- **更灵活**：SQL-like 的 API，更接近原生 SQL
- **更快的性能**：更少的抽象层，更快的查询执行

## 安装依赖

```bash
# 移除 Prisma
pnpm remove @prisma/client @prisma/adapter-pg prisma

# 安装 Drizzle
pnpm add drizzle-orm postgres @paralleldrive/cuid2
pnpm add -D drizzle-kit
```

## Schema 定义

### Prisma Schema

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([email])
  @@map("users")
}
```

### Drizzle Schema

```typescript
import { pgTable, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    email: varchar('email', { length: 255 }).notNull().unique(),
    username: varchar('username', { length: 100 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

## 查询对比

### 查询单条记录

**Prisma:**
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
});
```

**Drizzle:**
```typescript
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});
```

### 查询多条记录

**Prisma:**
```typescript
const users = await prisma.user.findMany({
  where: { isActive: true },
  orderBy: { createdAt: 'desc' },
  take: 10,
  skip: 0,
});
```

**Drizzle:**
```typescript
const usersList = await db.query.users.findMany({
  where: eq(users.isActive, true),
  orderBy: [desc(users.createdAt)],
  limit: 10,
  offset: 0,
});
```

### 创建记录

**Prisma:**
```typescript
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    username: 'john',
    password: hashedPassword,
  },
});
```

**Drizzle:**
```typescript
const [user] = await db
  .insert(users)
  .values({
    email: 'user@example.com',
    username: 'john',
    password: hashedPassword,
  })
  .returning();
```

### 更新记录

**Prisma:**
```typescript
const user = await prisma.user.update({
  where: { id: userId },
  data: { email: 'newemail@example.com' },
});
```

**Drizzle:**
```typescript
const [user] = await db
  .update(users)
  .set({ email: 'newemail@example.com' })
  .where(eq(users.id, userId))
  .returning();
```

### 删除记录

**Prisma:**
```typescript
await prisma.user.delete({
  where: { id: userId },
});
```

**Drizzle:**
```typescript
await db.delete(users).where(eq(users.id, userId));
```

### 关联查询

**Prisma:**
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    userRoles: {
      include: {
        role: true,
      },
    },
  },
});
```

**Drizzle:**
```typescript
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    userRoles: {
      with: {
        role: true,
      },
    },
  },
});
```

### 复杂条件查询

**Prisma:**
```typescript
const users = await prisma.user.findMany({
  where: {
    OR: [
      { email: { contains: '@example.com' } },
      { username: { contains: 'admin' } },
    ],
    AND: [
      { isActive: true },
      { isVerified: true },
    ],
  },
});
```

**Drizzle:**
```typescript
const usersList = await db.query.users.findMany({
  where: and(
    or(
      like(users.email, '%@example.com%'),
      like(users.username, '%admin%')
    ),
    eq(users.isActive, true),
    eq(users.isVerified, true)
  ),
});
```

## 事务处理

**Prisma:**
```typescript
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  await tx.userRole.create({ data: { userId: user.id, roleId } });
  return user;
});
```

**Drizzle:**
```typescript
const result = await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values(userData).returning();
  await tx.insert(userRoles).values({ userId: user.id, roleId });
  return user;
});
```

## 原始 SQL

**Prisma:**
```typescript
const result = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;
```

**Drizzle:**
```typescript
const result = await db.execute(sql`SELECT * FROM users WHERE email = ${email}`);
```

## 数据库命令

### Prisma

```bash
# 生成客户端
pnpm db:generate

# 推送 schema
pnpm db:push

# 创建迁移
pnpm db:migrate

# 打开 Studio
pnpm db:studio

# 运行种子
pnpm db:seed
```

### Drizzle

```bash
# 生成迁移
pnpm db:generate

# 推送到数据库
pnpm db:push

# 运行迁移
pnpm db:migrate

# 打开 Studio
pnpm db:studio

# 运行种子
pnpm db:seed
```

## 配置文件

### Prisma (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Drizzle (`drizzle.config.ts`)

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/core/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## 迁移步骤

### 1. 创建 Drizzle Schema

在 `src/core/database/schema/` 目录下创建表定义：

```
src/core/database/schema/
├── index.ts          # 统一导出
├── users.ts          # 用户表
├── roles.ts          # 角色表
├── permissions.ts    # 权限表
└── relations.ts      # 关系定义
```

### 2. 更新数据库客户端

```typescript
// src/core/database/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const queryClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle(queryClient, { schema });
```

### 3. 生成并运行迁移

```bash
# 生成迁移文件
pnpm db:generate

# 运行迁移
pnpm db:push
```

### 4. 更新服务代码

将所有 `prisma.model.method()` 替换为 Drizzle 查询。

### 5. 运行种子数据

```bash
pnpm db:seed
```

## 常用操作符

```typescript
import { eq, ne, gt, gte, lt, lte, like, ilike, and, or, not, isNull, isNotNull, inArray } from 'drizzle-orm';

// 等于
eq(users.id, userId)

// 不等于
ne(users.status, 'deleted')

// 大于/小于
gt(users.age, 18)
lt(users.age, 65)

// 模糊匹配
like(users.email, '%@example.com%')
ilike(users.username, '%admin%') // 不区分大小写

// AND/OR
and(eq(users.isActive, true), eq(users.isVerified, true))
or(eq(users.role, 'admin'), eq(users.role, 'moderator'))

// NULL 检查
isNull(users.deletedAt)
isNotNull(users.lastLoginAt)

// IN 查询
inArray(users.id, ['id1', 'id2', 'id3'])
```

## 最佳实践

### 1. 使用类型推断

```typescript
// 自动推断类型
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### 2. 创建查询辅助函数

```typescript
// src/core/database/helpers.ts
export const SoftDeleteHelper = {
  notDeleted: (deletedAtColumn: any) => isNull(deletedAtColumn),
  softDelete: () => ({ deletedAt: new Date() }),
  restore: () => ({ deletedAt: null }),
};
```

### 3. 使用事务

```typescript
await db.transaction(async (tx) => {
  // 所有操作在同一事务中
  await tx.insert(users).values(userData);
  await tx.insert(userRoles).values(roleData);
});
```

### 4. 分页查询

```typescript
const page = 1;
const pageSize = 10;

const usersList = await db.query.users.findMany({
  limit: pageSize,
  offset: (page - 1) * pageSize,
  orderBy: [desc(users.createdAt)],
});
```

## 性能优化

### 1. 只查询需要的字段

```typescript
const users = await db
  .select({
    id: users.id,
    email: users.email,
    username: users.username,
  })
  .from(users);
```

### 2. 使用索引

```typescript
export const users = pgTable(
  'users',
  { /* columns */ },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    usernameIdx: index('users_username_idx').on(table.username),
  })
);
```

### 3. 批量操作

```typescript
// 批量插入
await db.insert(users).values([user1, user2, user3]);

// 批量更新
await db.update(users)
  .set({ isActive: false })
  .where(inArray(users.id, userIds));
```

## 故障排查

### 连接问题

确保数据库 URL 格式正确：
```
postgresql://username:password@host:port/database
```

### 迁移失败

检查 schema 定义是否正确，确保所有外键引用存在。

### 类型错误

确保导入了正确的操作符和类型。

## 相关文档

- [Drizzle 官方文档](https://orm.drizzle.team/)
- [Prisma 使用指南](./prisma-guide.md)
- [数据库设计文档](./database-design.md)
