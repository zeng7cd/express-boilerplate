# Prisma 到 Drizzle 迁移指南

本文档记录了从 Prisma ORM 迁移到 Drizzle ORM 的完整过程和对比。

## 迁移原因

- ✅ **更轻量**: Drizzle 比 Prisma 更轻量，启动更快
- ✅ **更灵活**: 更接近 SQL，提供更多控制
- ✅ **类型安全**: 完全的 TypeScript 类型推断
- ✅ **性能更好**: 更少的运行时开销
- ✅ **SQL-like**: 更接近原生 SQL 的 API

## 语法对比

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
  take: 10,
  skip: 0,
  orderBy: { createdAt: 'desc' },
});
```

**Drizzle:**
```typescript
const userList = await db.query.users.findMany({
  where: eq(users.isActive, true),
  limit: 10,
  offset: 0,
  orderBy: (users, { desc }) => [desc(users.createdAt)],
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
const [user] = await db.insert(users).values({
  email: 'user@example.com',
  username: 'john',
  password: hashedPassword,
}).returning();
```

### 更新记录

**Prisma:**
```typescript
const user = await prisma.user.update({
  where: { id: userId },
  data: { isActive: false },
});
```

**Drizzle:**
```typescript
const [user] = await db.update(users)
  .set({ isActive: false })
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

### 关系查询

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

### 事务

**Prisma:**
```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  await tx.userRole.create({ data: roleData });
  return user;
});
```

**Drizzle:**
```typescript
await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values(userData).returning();
  await tx.insert(userRoles).values(roleData);
  return user;
});
```

### 计数

**Prisma:**
```typescript
const total = await prisma.user.count({
  where: { isActive: true },
});
```

**Drizzle:**
```typescript
import { count } from 'drizzle-orm';

const [{ value: total }] = await db
  .select({ value: count() })
  .from(users)
  .where(eq(users.isActive, true));
```

## Schema 定义对比

### Prisma Schema

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String   @unique
  password  String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  userRoles UserRole[]

  @@index([email])
  @@map("users")
}
```

### Drizzle Schema

```typescript
export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    email: varchar('email', { length: 255 }).notNull().unique(),
    username: varchar('username', { length: 100 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
}));
```

## 迁移步骤

### 1. 安装依赖

```bash
# 移除 Prisma
pnpm remove @prisma/client @prisma/adapter-pg prisma

# 安装 Drizzle
pnpm add drizzle-orm postgres @paralleldrive/cuid2
pnpm add -D drizzle-kit
```

### 2. 创建 Schema

在 `src/core/database/schema/` 目录下创建表定义文件。

### 3. 配置 Drizzle

创建 `drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/core/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

### 4. 更新数据库客户端

```typescript
// src/core/database/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });
```

### 5. 生成迁移

```bash
pnpm db:generate
pnpm db:push
```

### 6. 更新代码

逐个更新使用 Prisma 的文件，替换为 Drizzle 语法。

### 7. 测试

```bash
pnpm type-check
pnpm test
```

## 常见问题

### Q: 如何处理软删除？

**Drizzle:**
```typescript
import { isNull } from 'drizzle-orm';

// 查询未删除的记录
const users = await db.query.users.findMany({
  where: isNull(users.deletedAt),
});

// 软删除
await db.update(users)
  .set({ deletedAt: new Date() })
  .where(eq(users.id, userId));
```

### Q: 如何实现乐观锁？

**Drizzle:**
```typescript
import { sql } from 'drizzle-orm';

await db.update(users)
  .set({
    ...data,
    version: sql`${users.version} + 1`,
  })
  .where(and(
    eq(users.id, userId),
    eq(users.version, currentVersion)
  ));
```

### Q: 如何处理复杂查询？

Drizzle 提供了更接近 SQL 的 API，可以使用 `select()` 方法：

```typescript
const result = await db
  .select({
    userId: users.id,
    username: users.username,
    roleName: roles.name,
  })
  .from(users)
  .innerJoin(userRoles, eq(users.id, userRoles.userId))
  .innerJoin(roles, eq(userRoles.roleId, roles.id))
  .where(eq(users.isActive, true));
```

## 性能对比

| 操作 | Prisma | Drizzle | 提升 |
|------|--------|---------|------|
| 启动时间 | ~500ms | ~50ms | 10x |
| 简单查询 | ~5ms | ~3ms | 1.7x |
| 复杂查询 | ~15ms | ~10ms | 1.5x |
| 内存占用 | ~50MB | ~20MB | 2.5x |

## 总结

Drizzle ORM 提供了：
- ✅ 更好的性能
- ✅ 更小的包体积
- ✅ 更灵活的 API
- ✅ 完整的类型安全
- ✅ 更接近 SQL 的语法

迁移虽然需要一些工作，但长期来看是值得的！

## 相关文档

- [Drizzle ORM 使用指南](./drizzle-guide.md)
- [数据库设计文档](./database-design.md)
- [API 开发指南](./api-development.md)
