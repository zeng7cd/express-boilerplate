# Drizzle ORM 使用指南

本项目使用 Drizzle ORM 作为数据库访问层，提供类型安全的数据库操作。

## 📋 目录

- [简介](#简介)
- [配置](#配置)
- [Schema 定义](#schema-定义)
- [基本查询](#基本查询)
- [高级查询](#高级查询)
- [事务处理](#事务处理)
- [迁移管理](#迁移管理)
- [最佳实践](#最佳实践)

## 简介

Drizzle ORM 是一个轻量级的 TypeScript ORM，具有以下特点：

- 🎯 完全类型安全
- 🚀 零运行时开销
- 📝 SQL-like 查询语法
- 🔄 自动迁移生成
- 🎨 优秀的开发体验

## 配置

### 数据库连接

数据库连接配置在 `src/core/database/client.ts`：

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env';
import * as schema from './schema';

// 创建 PostgreSQL 连接
const queryClient = postgres(env.DATABASE_URL, {
  max: env.DB_POOL_MAX,              // 最大连接数
  idle_timeout: env.DB_IDLE_TIMEOUT / 1000,
  connect_timeout: env.DB_CONNECTION_TIMEOUT / 1000,
});

// 创建 Drizzle 实例
export const db = drizzle(queryClient, { schema });
```

### Drizzle Kit 配置

配置文件 `drizzle.config.ts`：

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/core/database/schema/index.ts',  // Schema 文件路径
  out: './drizzle',                               // 迁移文件输出目录
  dialect: 'postgresql',                          // 数据库类型
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
```

## Schema 定义

### 基本表定义

```typescript
import { pgTable, varchar, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const users = pgTable('users', {
  // 主键（自动生成 CUID）
  id: varchar('id', { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),
  
  // 基本字段
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  
  // 可选字段
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  
  // 布尔字段（带默认值）
  isActive: boolean('is_active').notNull().default(true),
  isVerified: boolean('is_verified').notNull().default(false),
  
  // 时间戳
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  
  // 软删除
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  
  // 乐观锁版本号
  version: integer('version').notNull().default(1),
});

// 类型推导
export type User = typeof users.$inferSelect;      // 查询结果类型
export type NewUser = typeof users.$inferInsert;   // 插入数据类型
```

### 添加索引

```typescript
import { pgTable, varchar, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 128 }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    username: varchar('username', { length: 100 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => ({
    // 普通索引
    emailIdx: index('users_email_idx').on(table.email),
    usernameIdx: index('users_username_idx').on(table.username),
    
    // 唯一索引
    emailUniqueIdx: uniqueIndex('users_email_unique_idx').on(table.email),
    
    // 复合索引
    activeEmailIdx: index('users_active_email_idx').on(table.isActive, table.email),
  })
);
```

### 表关系定义

```typescript
import { relations } from 'drizzle-orm';
import { users, roles, userRoles } from './schema';

// 用户与角色的多对多关系
export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
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

## 基本查询

### 导入数据库实例

```typescript
import { db, users } from '@/core/database';
```

### 查询所有记录

```typescript
// 查询所有用户
const allUsers = await db.select().from(users);

// 查询特定字段
const userEmails = await db
  .select({
    id: users.id,
    email: users.email,
  })
  .from(users);
```

### 条件查询

```typescript
import { eq, and, or, gt, lt, like, isNull } from 'drizzle-orm';

// 单条件查询
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, 'user@example.com'));

// 多条件查询（AND）
const activeUsers = await db
  .select()
  .from(users)
  .where(
    and(
      eq(users.isActive, true),
      isNull(users.deletedAt)
    )
  );

// 多条件查询（OR）
const searchUsers = await db
  .select()
  .from(users)
  .where(
    or(
      like(users.email, '%@example.com'),
      like(users.username, 'admin%')
    )
  );

// 比较运算符
const recentUsers = await db
  .select()
  .from(users)
  .where(gt(users.createdAt, new Date('2024-01-01')));
```

### 查询单条记录

```typescript
// 使用 findFirst（推荐）
const user = await db.query.users.findFirst({
  where: eq(users.email, 'user@example.com'),
});

// 使用 limit
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.email, 'user@example.com'))
  .limit(1);
```

### 插入数据

```typescript
// 插入单条记录
const [newUser] = await db
  .insert(users)
  .values({
    email: 'user@example.com',
    username: 'johndoe',
    password: 'hashedPassword',
  })
  .returning();

// 插入多条记录
const newUsers = await db
  .insert(users)
  .values([
    { email: 'user1@example.com', username: 'user1', password: 'hash1' },
    { email: 'user2@example.com', username: 'user2', password: 'hash2' },
  ])
  .returning();

// 插入并返回特定字段
const [user] = await db
  .insert(users)
  .values({ email: 'user@example.com', username: 'john', password: 'hash' })
  .returning({ id: users.id, email: users.email });
```

### 更新数据

```typescript
// 更新单条记录
const [updatedUser] = await db
  .update(users)
  .set({
    firstName: 'John',
    lastName: 'Doe',
    updatedAt: new Date(),
  })
  .where(eq(users.id, userId))
  .returning();

// 更新多条记录
await db
  .update(users)
  .set({ isActive: false })
  .where(eq(users.isVerified, false));

// 使用 SQL 表达式更新
import { sql } from 'drizzle-orm';

await db
  .update(users)
  .set({
    version: sql`${users.version} + 1`,
  })
  .where(eq(users.id, userId));
```

### 删除数据

```typescript
// 硬删除
await db
  .delete(users)
  .where(eq(users.id, userId));

// 软删除
await db
  .update(users)
  .set({ deletedAt: new Date() })
  .where(eq(users.id, userId));
```

## 高级查询

### 关联查询

```typescript
// 使用 query API（推荐）
const userWithRoles = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    userRoles: {
      with: {
        role: true,
      },
    },
  },
});

// 嵌套关联
const userWithFullData = await db.query.users.findFirst({
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

### JOIN 查询

```typescript
import { eq } from 'drizzle-orm';

// INNER JOIN
const result = await db
  .select({
    userId: users.id,
    userName: users.username,
    roleName: roles.name,
  })
  .from(users)
  .innerJoin(userRoles, eq(users.id, userRoles.userId))
  .innerJoin(roles, eq(userRoles.roleId, roles.id));

// LEFT JOIN
const result = await db
  .select()
  .from(users)
  .leftJoin(userRoles, eq(users.id, userRoles.userId));
```

### 聚合查询

```typescript
import { count, sum, avg, max, min } from 'drizzle-orm';

// 计数
const [{ userCount }] = await db
  .select({ userCount: count() })
  .from(users);

// 分组统计
const roleStats = await db
  .select({
    roleId: userRoles.roleId,
    userCount: count(userRoles.userId),
  })
  .from(userRoles)
  .groupBy(userRoles.roleId);
```

### 分页查询

```typescript
// 基本分页
const page = 1;
const pageSize = 10;
const offset = (page - 1) * pageSize;

const users = await db
  .select()
  .from(users)
  .limit(pageSize)
  .offset(offset);

// 带总数的分页
const [usersData, [{ total }]] = await Promise.all([
  db.select().from(users).limit(pageSize).offset(offset),
  db.select({ total: count() }).from(users),
]);

const result = {
  data: usersData,
  pagination: {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  },
};
```

### 排序

```typescript
import { asc, desc } from 'drizzle-orm';

// 单字段排序
const users = await db
  .select()
  .from(users)
  .orderBy(desc(users.createdAt));

// 多字段排序
const users = await db
  .select()
  .from(users)
  .orderBy(asc(users.lastName), asc(users.firstName));
```

### 子查询

```typescript
import { sql } from 'drizzle-orm';

// 使用子查询
const activeUserIds = db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.isActive, true));

const sessions = await db
  .select()
  .from(sessions)
  .where(sql`${sessions.userId} IN ${activeUserIds}`);
```

## 事务处理

### 基本事务

```typescript
// 自动提交/回滚
await db.transaction(async (tx) => {
  // 创建用户
  const [user] = await tx
    .insert(users)
    .values({
      email: 'user@example.com',
      username: 'john',
      password: 'hash',
    })
    .returning();

  // 分配角色
  await tx.insert(userRoles).values({
    userId: user.id,
    roleId: defaultRoleId,
  });

  // 如果抛出错误，事务会自动回滚
  if (!user.id) {
    throw new Error('User creation failed');
  }
});
```

### 嵌套事务

```typescript
await db.transaction(async (tx) => {
  // 外层事务
  const [user] = await tx.insert(users).values({...}).returning();

  // 嵌套事务
  await tx.transaction(async (tx2) => {
    await tx2.insert(userRoles).values({...});
    await tx2.insert(sessions).values({...});
  });
});
```

### 手动控制事务

```typescript
const tx = await db.transaction();

try {
  await tx.insert(users).values({...});
  await tx.insert(userRoles).values({...});
  
  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
}
```

## 迁移管理

### 生成迁移文件

```bash
# 根据 schema 变更生成迁移文件
pnpm db:generate
```

这会在 `drizzle/` 目录下生成 SQL 迁移文件。

### 执行迁移

```typescript
// src/core/database/migrate.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: './drizzle' });
await sql.end();
```

```bash
# 执行迁移
pnpm db:migrate
```

### Drizzle Studio

可视化数据库管理工具：

```bash
# 启动 Drizzle Studio
pnpm db:studio
```

访问 `https://local.drizzle.studio` 查看和管理数据库。

## 最佳实践

### 1. 使用辅助函数

```typescript
// src/core/database/helpers.ts
import { eq, and, isNull } from 'drizzle-orm';

export const SoftDeleteHelper = {
  // 查询未删除的记录
  notDeleted: (deletedAtColumn: any) => isNull(deletedAtColumn),
  
  // 软删除
  softDelete: () => ({ deletedAt: new Date() }),
  
  // 恢复
  restore: () => ({ deletedAt: null }),
};

// 使用
const activeUsers = await db
  .select()
  .from(users)
  .where(
    and(
      eq(users.isActive, true),
      SoftDeleteHelper.notDeleted(users.deletedAt)
    )
  );
```

### 2. 类型安全的查询

```typescript
// 定义查询结果类型
type UserWithRoles = {
  id: string;
  email: string;
  roles: Array<{
    id: string;
    name: string;
  }>;
};

// 使用类型
const getUserWithRoles = async (userId: string): Promise<UserWithRoles | null> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
    },
    with: {
      userRoles: {
        columns: {},
        with: {
          role: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    roles: user.userRoles.map((ur) => ur.role),
  };
};
```

### 3. 查询构建器模式

```typescript
class UserRepository {
  private baseQuery() {
    return db
      .select()
      .from(users)
      .where(isNull(users.deletedAt));
  }

  async findById(id: string) {
    return this.baseQuery()
      .where(eq(users.id, id))
      .limit(1);
  }

  async findActive() {
    return this.baseQuery()
      .where(eq(users.isActive, true));
  }

  async findByEmail(email: string) {
    return this.baseQuery()
      .where(eq(users.email, email))
      .limit(1);
  }
}
```

### 4. 乐观锁实现

```typescript
// 更新时检查版本号
const updateUser = async (id: string, version: number, data: Partial<User>) => {
  const [updated] = await db
    .update(users)
    .set({
      ...data,
      version: sql`${users.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(users.id, id),
        eq(users.version, version)
      )
    )
    .returning();

  if (!updated) {
    throw new Error('Update conflict: record was modified by another process');
  }

  return updated;
};
```

### 5. 批量操作优化

```typescript
// 批量插入（使用单个查询）
const batchInsertUsers = async (userData: NewUser[]) => {
  // 分批处理，避免单次插入过多
  const batchSize = 100;
  const results = [];

  for (let i = 0; i < userData.length; i += batchSize) {
    const batch = userData.slice(i, i + batchSize);
    const inserted = await db
      .insert(users)
      .values(batch)
      .returning();
    results.push(...inserted);
  }

  return results;
};
```

### 6. 错误处理

```typescript
import { DatabaseError } from 'pg';

try {
  await db.insert(users).values({
    email: 'duplicate@example.com',
    username: 'duplicate',
    password: 'hash',
  });
} catch (error) {
  if (error instanceof DatabaseError) {
    // PostgreSQL 错误码
    if (error.code === '23505') {
      // 唯一约束冲突
      throw new DuplicateException('User already exists');
    }
    if (error.code === '23503') {
      // 外键约束冲突
      throw new NotFoundException('Referenced record not found');
    }
  }
  throw error;
}
```

### 7. 性能优化

```typescript
// 使用索引
// 确保频繁查询的字段有索引

// 选择必要的字段
const users = await db
  .select({
    id: users.id,
    email: users.email,
    // 只选择需要的字段
  })
  .from(users);

// 使用连接池
// 在 client.ts 中配置合适的连接池大小

// 避免 N+1 查询
// 使用 with 进行关联查询，而不是循环查询
```

## 常见问题

### Q: 如何处理时区问题？

A: 使用 `timestamp` 时指定 `withTimezone: true`：

```typescript
createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
```

### Q: 如何实现全文搜索？

A: 使用 PostgreSQL 的全文搜索功能：

```typescript
import { sql } from 'drizzle-orm';

const searchResults = await db
  .select()
  .from(users)
  .where(
    sql`to_tsvector('english', ${users.username} || ' ' || ${users.email}) @@ plainto_tsquery('english', ${searchTerm})`
  );
```

### Q: 如何处理 JSON 字段？

A: 使用 `jsonb` 类型：

```typescript
import { pgTable, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: varchar('id', { length: 128 }).primaryKey(),
  metadata: jsonb('metadata').$type<{ theme: string; language: string }>(),
});
```

### Q: 如何实现软删除查询？

A: 创建辅助函数或使用视图：

```typescript
// 方法1: 辅助函数
const getActiveUsers = () => 
  db.select().from(users).where(isNull(users.deletedAt));

// 方法2: 创建数据库视图
// CREATE VIEW active_users AS SELECT * FROM users WHERE deleted_at IS NULL;
```

## 相关资源

- [Drizzle ORM 官方文档](https://orm.drizzle.team/)
- [Drizzle Kit 文档](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [项目 Schema 定义](../src/core/database/schema/)
