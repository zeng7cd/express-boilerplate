# Drizzle ORM 使用指南

本文档介绍项目中 Drizzle ORM 的使用方法和最佳实践。

## 目录

- [基础配置](#基础配置)
- [Schema 定义](#schema-定义)
- [CRUD 操作](#crud-操作)
- [关系查询](#关系查询)
- [事务处理](#事务处理)
- [最佳实践](#最佳实践)

## 基础配置

### Schema 文件位置

```
src/core/database/schema/
├── index.ts          # 统一导出
├── users.ts          # 用户表
├── roles.ts          # 角色表
├── permissions.ts    # 权限表
└── relations.ts      # 关联表和关系定义
```

### 数据库连接

```typescript
// src/core/database/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });
```

### Drizzle 配置

```typescript
// drizzle.config.ts
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

## Schema 定义

### 基础表定义

```typescript
// src/core/database/schema/users.ts
import { pgTable, varchar, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const users = pgTable('users', {
  id: varchar('id', { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  isVerified: boolean('is_verified').notNull().default(false),
  version: integer('version').notNull().default(1),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### 添加索引

```typescript
import { index, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    // ... 字段定义
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    usernameIdx: index('users_username_idx').on(table.username),
    isActiveIdx: index('users_is_active_idx').on(table.isActive),
  })
);
```

### 外键关系

```typescript
export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 128 }).primaryKey(),
  userId: varchar('user_id', { length: 128 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 500 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
```

### 定义关系

```typescript
// src/core/database/schema/relations.ts
import { relations } from 'drizzle-orm';

export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));
```

## CRUD 操作

### Create（创建）

```typescript
import { db, users } from '@/core/database';

// 创建单条记录
const [user] = await db.insert(users).values({
  email: 'user@example.com',
  username: 'john',
  password: hashedPassword,
}).returning();

// 创建多条记录
const newUsers = await db.insert(users).values([
  { email: 'user1@example.com', username: 'user1', password: 'hash1' },
  { email: 'user2@example.com', username: 'user2', password: 'hash2' },
]).returning();

// 创建并返回特定字段
const [user] = await db.insert(users)
  .values({ email, username, password })
  .returning({ id: users.id, email: users.email });
```

### Read（查询）

```typescript
import { eq, and, or, like, gt, lt } from 'drizzle-orm';

// 查询单条记录
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});

// 查询多条记录
const userList = await db.query.users.findMany({
  where: eq(users.isActive, true),
  limit: 10,
  offset: 0,
  orderBy: (users, { desc }) => [desc(users.createdAt)],
});

// 使用 select 查询
const userList = await db
  .select()
  .from(users)
  .where(eq(users.isActive, true))
  .limit(10)
  .offset(0);

// 只选择特定字段
const userList = await db
  .select({
    id: users.id,
    email: users.email,
    username: users.username,
  })
  .from(users)
  .where(eq(users.isActive, true));

// 复杂查询条件
const userList = await db.query.users.findMany({
  where: and(
    eq(users.isActive, true),
    or(
      like(users.email, '%@example.com'),
      like(users.username, 'admin%')
    )
  ),
});

// 计数
import { count } from 'drizzle-orm';

const [{ value: total }] = await db
  .select({ value: count() })
  .from(users)
  .where(eq(users.isActive, true));
```

### Update（更新）

```typescript
// 更新单条记录
await db.update(users)
  .set({
    email: 'newemail@example.com',
    updatedAt: new Date(),
  })
  .where(eq(users.id, userId));

// 更新并返回
const [updatedUser] = await db.update(users)
  .set({ isActive: false })
  .where(eq(users.id, userId))
  .returning();

// 条件更新
await db.update(users)
  .set({ deletedAt: new Date() })
  .where(and(
    eq(users.isActive, false),
    lt(users.lastLoginAt, new Date('2024-01-01'))
  ));

// 原子操作（递增）
import { sql } from 'drizzle-orm';

await db.update(users)
  .set({ version: sql`${users.version} + 1` })
  .where(eq(users.id, userId));
```

### Delete（删除）

```typescript
// 删除单条记录
await db.delete(users).where(eq(users.id, userId));

// 删除多条记录
await db.delete(users).where(eq(users.isActive, false));

// 删除并返回
const deletedUsers = await db.delete(users)
  .where(eq(users.isActive, false))
  .returning();

// 软删除（推荐）
await db.update(users)
  .set({ deletedAt: new Date() })
  .where(eq(users.id, userId));
```

## 关系查询

### 一对多查询

```typescript
// 查询用户及其会话
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    sessions: true,
  },
});

// 带条件的关系查询
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    sessions: {
      where: gt(sessions.expiresAt, new Date()),
      limit: 5,
      orderBy: (sessions, { desc }) => [desc(sessions.createdAt)],
    },
  },
});
```

### 多对多查询

```typescript
// 查询用户及其角色和权限
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

### 嵌套查询

```typescript
// 查询有特定角色的用户
const adminUsers = await db.query.users.findMany({
  with: {
    userRoles: {
      where: (userRoles, { eq }) => eq(userRoles.role.name, 'admin'),
      with: {
        role: true,
      },
    },
  },
});
```

## 事务处理

### 基础事务

```typescript
await db.transaction(async (tx) => {
  // 创建用户
  const [user] = await tx.insert(users).values({
    email: 'user@example.com',
    username: 'john',
    password: hashedPassword,
  }).returning();

  // 分配角色
  await tx.insert(userRoles).values({
    userId: user.id,
    roleId: defaultRoleId,
  });

  // 创建审计日志
  await tx.insert(auditLogs).values({
    userId: user.id,
    action: 'USER_CREATED',
    resource: 'user',
    resourceId: user.id,
  });

  return user;
});
```

### 事务回滚

```typescript
try {
  await db.transaction(async (tx) => {
    await tx.insert(users).values(userData);
    
    // 如果这里抛出错误，整个事务会回滚
    if (someCondition) {
      throw new Error('Transaction failed');
    }
    
    await tx.insert(userRoles).values(roleData);
  });
} catch (error) {
  console.error('Transaction rolled back:', error);
}
```

## 高级查询

### 聚合查询

```typescript
import { count, sum, avg, min, max } from 'drizzle-orm';

// 计数
const [{ total }] = await db
  .select({ total: count() })
  .from(users);

// 多个聚合
const [stats] = await db
  .select({
    total: count(),
    avgAge: avg(users.age),
    minAge: min(users.age),
    maxAge: max(users.age),
  })
  .from(users)
  .where(eq(users.isActive, true));
```

### 分组查询

```typescript
// 按状态分组统计
const stats = await db
  .select({
    status: users.isActive,
    count: count(),
  })
  .from(users)
  .groupBy(users.isActive);
```

### 联表查询

```typescript
import { eq } from 'drizzle-orm';

// 内连接
const result = await db
  .select({
    userId: users.id,
    username: users.username,
    roleName: roles.name,
  })
  .from(users)
  .innerJoin(userRoles, eq(users.id, userRoles.userId))
  .innerJoin(roles, eq(userRoles.roleId, roles.id));

// 左连接
const result = await db
  .select()
  .from(users)
  .leftJoin(sessions, eq(users.id, sessions.userId));
```

### 子查询

```typescript
import { sql } from 'drizzle-orm';

const subquery = db
  .select({ userId: userRoles.userId })
  .from(userRoles)
  .where(eq(userRoles.roleId, adminRoleId));

const adminUsers = await db
  .select()
  .from(users)
  .where(sql`${users.id} IN ${subquery}`);
```

## 最佳实践

### 1. 使用 Repository 模式

```typescript
// src/modules/users/repositories/user.repository.ts
import { db, users } from '@/core/database';
import { eq } from 'drizzle-orm';

export class UserRepository {
  async findById(id: string) {
    return db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  async findByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async create(data: NewUser) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async update(id: string, data: Partial<User>) {
    const [user] = await db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async softDelete(id: string) {
    return db.update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, id));
  }
}
```

### 2. 类型安全

```typescript
// 使用推断类型
type User = typeof users.$inferSelect;
type NewUser = typeof users.$inferInsert;

// 在函数中使用
async function createUser(data: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}
```

### 3. 软删除过滤

```typescript
import { isNull } from 'drizzle-orm';

// 辅助函数
export const notDeleted = (deletedAtColumn: any) => isNull(deletedAtColumn);

// 使用
const activeUsers = await db.query.users.findMany({
  where: notDeleted(users.deletedAt),
});
```

### 4. 乐观锁

```typescript
import { eq, and, sql } from 'drizzle-orm';

async function updateWithOptimisticLock(
  id: string,
  currentVersion: number,
  data: Partial<User>
) {
  const [updated] = await db.update(users)
    .set({
      ...data,
      version: sql`${users.version} + 1`,
      updatedAt: new Date(),
    })
    .where(and(
      eq(users.id, id),
      eq(users.version, currentVersion)
    ))
    .returning();

  if (!updated) {
    throw new Error('Data has been modified by another request');
  }

  return updated;
}
```

### 5. 分页查询

```typescript
async function getPaginatedUsers(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;

  const [items, [{ total }]] = await Promise.all([
    db.query.users.findMany({
      limit: pageSize,
      offset,
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    }),
    db.select({ total: count() }).from(users),
  ]);

  return {
    data: items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
```

### 6. 错误处理

```typescript
import { DatabaseError } from 'pg';

try {
  await db.insert(users).values(userData);
} catch (error) {
  if (error instanceof DatabaseError) {
    // 唯一约束冲突
    if (error.code === '23505') {
      throw new Error('Email already exists');
    }
    // 外键约束冲突
    if (error.code === '23503') {
      throw new Error('Referenced record not found');
    }
  }
  throw error;
}
```

## 常用命令

```bash
# 生成迁移文件
pnpm db:generate

# 执行迁移
pnpm db:push

# 打开 Drizzle Studio
pnpm db:studio

# 运行种子数据
pnpm db:seed
```

## 相关文档

- [Router 使用指南](./router-guide.md)
- [数据库设计规范](./database-design.md)
- [API 开发指南](./api-development.md)
