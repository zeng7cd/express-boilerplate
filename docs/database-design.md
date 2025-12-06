# 数据库设计文档

本文档描述项目的数据库设计、表结构和关系。

## 数据库技术栈

- **数据库**: PostgreSQL 14+
- **ORM**: Prisma 7.x
- **连接池**: Prisma 内置连接池
- **迁移工具**: Prisma Migrate

## 数据模型概览

```
User (用户)
  ├── UserRole (用户角色关联)
  │     └── Role (角色)
  │           └── RolePermission (角色权限关联)
  │                 └── Permission (权限)
  ├── Session (会话)
  └── AuditLog (审计日志)
```

## 表结构详解

### 1. User (用户表)

存储用户基本信息。

```prisma
model User {
  id          String    @id @default(cuid())
  email       String    @unique
  username    String    @unique
  password    String
  firstName   String?
  lastName    String?
  avatar      String?
  isActive    Boolean   @default(true)
  isVerified  Boolean   @default(false)
  lastLoginAt DateTime?
  version     Int       @default(1)
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  userRoles UserRole[]
  sessions  Session[]
  auditLogs AuditLog[]

  @@index([email])
  @@index([username])
  @@index([isActive])
  @@index([deletedAt])
  @@map("users")
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键，使用 CUID |
| email | String | 邮箱，唯一 |
| username | String | 用户名，唯一 |
| password | String | 密码（bcrypt 加密） |
| firstName | String? | 名 |
| lastName | String? | 姓 |
| avatar | String? | 头像 URL |
| isActive | Boolean | 是否激活 |
| isVerified | Boolean | 是否已验证邮箱 |
| lastLoginAt | DateTime? | 最后登录时间 |
| version | Int | 乐观锁版本号 |
| deletedAt | DateTime? | 软删除时间戳 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

**索引**:
- `email`: 用于登录查询
- `username`: 用于用户名查询
- `isActive`: 用于过滤激活用户
- `deletedAt`: 用于软删除过滤

### 2. Role (角色表)

定义系统角色。

```prisma
model Role {
  id          String    @id @default(cuid())
  name        String    @unique
  displayName String
  description String?
  isActive    Boolean   @default(true)
  version     Int       @default(1)
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  userRoles       UserRole[]
  rolePermissions RolePermission[]

  @@index([deletedAt])
  @@map("roles")
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| name | String | 角色名称（如 admin, user） |
| displayName | String | 显示名称 |
| description | String? | 角色描述 |
| isActive | Boolean | 是否激活 |
| version | Int | 乐观锁版本号 |
| deletedAt | DateTime? | 软删除时间戳 |

**预设角色**:
- `admin`: 管理员
- `user`: 普通用户
- `moderator`: 版主

### 3. Permission (权限表)

定义系统权限。

```prisma
model Permission {
  id          String   @id @default(cuid())
  name        String   @unique
  resource    String
  action      String
  description String?
  createdAt   DateTime @default(now())

  rolePermissions RolePermission[]

  @@unique([resource, action])
  @@map("permissions")
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| name | String | 权限名称（如 users:read） |
| resource | String | 资源名称（如 users） |
| action | String | 操作名称（如 read, write） |
| description | String? | 权限描述 |

**权限命名规范**:
- 格式: `resource:action`
- 示例: `users:read`, `users:write`, `posts:delete`

**常用权限**:
```
users:read      # 读取用户
users:write     # 创建/更新用户
users:delete    # 删除用户
roles:manage    # 管理角色
posts:read      # 读取文章
posts:write     # 创建/更新文章
posts:delete    # 删除文章
```

### 4. UserRole (用户角色关联表)

多对多关系：用户 ↔ 角色。

```prisma
model UserRole {
  id     String @id @default(cuid())
  userId String
  roleId String

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId])
  @@map("user_roles")
}
```

**特点**:
- 一个用户可以有多个角色
- 删除用户或角色时自动删除关联记录（Cascade）
- 唯一约束防止重复分配

### 5. RolePermission (角色权限关联表)

多对多关系：角色 ↔ 权限。

```prisma
model RolePermission {
  id           String @id @default(cuid())
  roleId       String
  permissionId String

  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
  @@map("role_permissions")
}
```

**特点**:
- 一个角色可以有多个权限
- 删除角色或权限时自动删除关联记录
- 唯一约束防止重复分配

### 6. Session (会话表)

存储用户登录会话。

```prisma
model Session {
  id           String   @id @default(cuid())
  userId       String
  token        String   @unique
  refreshToken String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([refreshToken])
  @@index([expiresAt])
  @@index([userId, expiresAt])
  @@map("sessions")
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| userId | String | 用户 ID |
| token | String | 访问令牌（JWT） |
| refreshToken | String | 刷新令牌 |
| expiresAt | DateTime | 过期时间 |

**索引优化**:
- `token`: 快速验证访问令牌
- `refreshToken`: 快速验证刷新令牌
- `expiresAt`: 清理过期会话
- `[userId, expiresAt]`: 复合索引，查询用户有效会话

### 7. AuditLog (审计日志表)

记录系统操作日志。

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  userId     String?
  action     String
  resource   String
  resourceId String?
  details    Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([action])
  @@index([resource])
  @@index([createdAt])
  @@index([userId, createdAt])
  @@index([resource, action, createdAt])
  @@map("audit_logs")
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| userId | String? | 操作用户 ID（可为空） |
| action | String | 操作类型 |
| resource | String | 资源类型 |
| resourceId | String? | 资源 ID |
| details | Json? | 详细信息（JSON） |
| ipAddress | String? | IP 地址 |
| userAgent | String? | User Agent |

**常用操作类型**:
```
USER_CREATED        # 用户创建
USER_UPDATED        # 用户更新
USER_DELETED        # 用户删除
USER_LOGIN          # 用户登录
USER_LOGOUT         # 用户登出
ROLE_ASSIGNED       # 角色分配
PERMISSION_GRANTED  # 权限授予
```

**索引优化**:
- `userId`: 查询用户操作历史
- `action`: 按操作类型过滤
- `resource`: 按资源类型过滤
- `createdAt`: 按时间排序
- 复合索引用于复杂查询

## 关系图

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       ├─────────────┐
       │             │
       ▼             ▼
┌─────────────┐ ┌─────────────┐
│  UserRole   │ │   Session   │
└──────┬──────┘ └─────────────┘
       │
       ▼
┌─────────────┐
│    Role     │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  RolePermission  │
└────────┬─────────┘
         │
         ▼
┌─────────────┐
│ Permission  │
└─────────────┘
```

## 数据完整性

### 外键约束

- `UserRole.userId` → `User.id` (CASCADE)
- `UserRole.roleId` → `Role.id` (CASCADE)
- `RolePermission.roleId` → `Role.id` (CASCADE)
- `RolePermission.permissionId` → `Permission.id` (CASCADE)
- `Session.userId` → `User.id` (CASCADE)
- `AuditLog.userId` → `User.id` (SET NULL)

### 唯一约束

- `User.email`: 邮箱唯一
- `User.username`: 用户名唯一
- `Role.name`: 角色名唯一
- `Permission.name`: 权限名唯一
- `Permission.[resource, action]`: 资源+操作组合唯一
- `UserRole.[userId, roleId]`: 防止重复分配角色
- `RolePermission.[roleId, permissionId]`: 防止重复分配权限
- `Session.token`: 访问令牌唯一
- `Session.refreshToken`: 刷新令牌唯一

## 软删除

以下表支持软删除（使用 `deletedAt` 字段）：

- `User`
- `Role`

**实现方式**:
```typescript
// 软删除
await prisma.user.update({
  where: { id },
  data: { deletedAt: new Date() },
});

// 查询时过滤已删除记录
await prisma.user.findMany({
  where: { deletedAt: null },
});
```

## 乐观锁

以下表使用乐观锁（`version` 字段）：

- `User`
- `Role`

**实现方式**:
```typescript
// 更新时检查版本号
await prisma.user.update({
  where: {
    id: userId,
    version: currentVersion,
  },
  data: {
    email: newEmail,
    version: { increment: 1 },
  },
});
```

## 索引策略

### 单列索引

用于频繁的单条件查询：
- `User.email`
- `User.username`
- `User.isActive`
- `Session.token`
- `AuditLog.action`

### 复合索引

用于多条件查询和排序：
- `Session.[userId, expiresAt]`: 查询用户有效会话
- `AuditLog.[userId, createdAt]`: 查询用户操作历史
- `AuditLog.[resource, action, createdAt]`: 查询特定资源操作

### 索引选择原则

1. **高频查询字段**: 如 email, username
2. **外键字段**: 自动创建索引
3. **排序字段**: 如 createdAt
4. **过滤字段**: 如 isActive, deletedAt
5. **复合查询**: 创建复合索引

## 数据迁移

### 创建迁移

```bash
# 开发环境
pnpm db:migrate

# 生产环境
pnpm db:migrate:prod
```

### 迁移文件

位置: `prisma/migrations/`

命名: `YYYYMMDDHHMMSS_description/`

### 迁移最佳实践

1. **小步迭代**: 每次迁移只做一件事
2. **可回滚**: 考虑回滚方案
3. **数据备份**: 生产环境迁移前备份
4. **测试验证**: 在测试环境验证迁移
5. **文档记录**: 记录重要的迁移说明

## 性能优化

### 查询优化

```typescript
// ❌ N+1 查询问题
const users = await prisma.user.findMany();
for (const user of users) {
  const roles = await prisma.userRole.findMany({
    where: { userId: user.id },
  });
}

// ✅ 使用 include 预加载
const users = await prisma.user.findMany({
  include: {
    userRoles: {
      include: { role: true },
    },
  },
});
```

### 分页查询

```typescript
const page = 1;
const pageSize = 10;

const [users, total] = await Promise.all([
  prisma.user.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
  }),
  prisma.user.count(),
]);
```

### 只查询需要的字段

```typescript
// ❌ 查询所有字段
const user = await prisma.user.findUnique({
  where: { id },
});

// ✅ 只查询需要的字段
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    username: true,
  },
});
```

## 数据备份

### 备份策略

1. **每日全量备份**: 凌晨 2:00
2. **每小时增量备份**: 工作时间
3. **保留周期**: 30 天

### 备份命令

```bash
# 导出数据库
pg_dump -U postgres -d dbname > backup.sql

# 导入数据库
psql -U postgres -d dbname < backup.sql
```

## 安全考虑

### 密码存储

- 使用 bcrypt 加密
- 加密轮次: 10
- 不存储明文密码

### SQL 注入防护

- Prisma 自动参数化查询
- 避免使用原始 SQL

### 敏感数据

- 密码字段不在 API 响应中返回
- 使用 `select` 排除敏感字段

```typescript
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    username: true,
    // 不包含 password
  },
});
```

## 相关文档

- [Prisma 使用指南](./prisma-guide.md)
- [API 开发指南](./api-development.md)
- [项目文档首页](./README.md)
