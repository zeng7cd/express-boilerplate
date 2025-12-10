# 工具函数和辅助类使用指南

本文档介绍项目中常用的工具函数、辅助类和实用方法。

## 📋 目录

- [异常处理](#异常处理)
- [响应封装](#响应封装)
- [数据验证](#数据验证)
- [分页工具](#分页工具)
- [软删除工具](#软删除工具)

## 异常处理

### AppException 基类

位置：`src/shared/exceptions/base.exception.ts`

所有自定义异常都继承自 `AppException`。

```typescript
export class AppException extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly details?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}
```

### 内置异常类

#### UnauthorizedException

用于认证失败的场景。

```typescript
import { UnauthorizedException } from '@/shared/exceptions';

// 基本使用
throw new UnauthorizedException('Invalid credentials');

// 带详细信息
throw new UnauthorizedException('Token expired', {
  expiredAt: new Date(),
  tokenId: 'abc123',
});
```

#### ForbiddenException

用于权限不足的场景。

```typescript
import { ForbiddenException } from '@/shared/exceptions';

throw new ForbiddenException('Insufficient permissions');

throw new ForbiddenException('Admin access required', {
  requiredRole: 'admin',
  userRole: 'user',
});
```

#### NotFoundException

用于资源不存在的场景。

```typescript
import { NotFoundException } from '@/shared/exceptions';

throw new NotFoundException('User not found');

throw new NotFoundException('Resource not found', {
  resourceType: 'user',
  resourceId: userId,
});
```

#### BadRequestException

用于请求参数错误的场景。

```typescript
import { BadRequestException } from '@/shared/exceptions';

throw new BadRequestException('Invalid email format');

throw new BadRequestException('Validation failed', {
  errors: [
    { field: 'email', message: 'Invalid format' },
    { field: 'password', message: 'Too short' },
  ],
});
```

#### DuplicateException

用于资源重复的场景。

```typescript
import { DuplicateException } from '@/shared/exceptions';

throw new DuplicateException('Email already exists');

throw new DuplicateException('Duplicate entry', {
  field: 'email',
  value: 'user@example.com',
});
```

#### InvalidCredentialsException

用于登录凭证错误的场景。

```typescript
import { InvalidCredentialsException } from '@/shared/exceptions';

throw new InvalidCredentialsException('Invalid email or password');
```

### 自定义异常

```typescript
import { AppException } from '@/shared/exceptions';

export class PaymentException extends AppException {
  constructor(message: string, details?: any) {
    super('PAYMENT_ERROR', message, 402, details);
  }
}

// 使用
throw new PaymentException('Payment failed', {
  orderId: '12345',
  amount: 99.99,
  reason: 'Insufficient funds',
});
```

### 异常处理中间件

位置：`src/shared/middleware/errorHandler.ts`

全局异常处理器会自动捕获所有异常并返回统一格式的错误响应。

```typescript
// 异常会被自动处理
app.use(errorHandler);

// 响应格式
{
  "success": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid credentials",
  "statusCode": 401,
  "details": {...}
}
```

### 使用示例

```typescript
import { NotFoundException, BadRequestException } from '@/shared/exceptions';

class UserService {
  async getUserById(userId: string): Promise<User> {
    // 验证参数
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    // 查询用户
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // 用户不存在
    if (!user) {
      throw new NotFoundException('User not found', { userId });
    }

    return user;
  }

  async createUser(data: CreateUserDto): Promise<User> {
    // 检查邮箱是否已存在
    const existing = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    if (existing) {
      throw new DuplicateException('Email already exists', {
        email: data.email,
      });
    }

    // 创建用户
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }
}
```

## 响应封装

### ServiceResponse 类

位置：`src/shared/utils/serviceResponse.ts`

统一的响应格式封装。

```typescript
import { ServiceResponse } from '@/shared/utils/serviceResponse';

// 成功响应
const response = ServiceResponse.success(
  'User created successfully',
  { id: '123', email: 'user@example.com' },
  201
);

// 失败响应
const response = ServiceResponse.failure(
  'Validation failed',
  { errors: [...] },
  400
);
```

### 响应格式

```typescript
interface ServiceResponse<T> {
  success: boolean;      // 是否成功
  statusCode: number;    // HTTP 状态码
  message: string;       // 响应消息
  data: T;              // 响应数据
}
```

### 在控制器中使用

```typescript
import { Request, Response } from 'express';
import { ServiceResponse } from '@/shared/utils/serviceResponse';

export class UserController {
  async create(req: Request, res: Response) {
    const user = await userService.create(req.body);
    
    const response = ServiceResponse.success(
      'User created successfully',
      user,
      201
    );
    
    res.status(response.statusCode).json(response);
  }

  async list(req: Request, res: Response) {
    const users = await userService.findAll();
    
    const response = ServiceResponse.success(
      'Users retrieved successfully',
      users
    );
    
    res.json(response);
  }
}
```

### 响应示例

成功响应：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User retrieved successfully",
  "data": {
    "id": "123",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

失败响应：

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "email", "message": "Invalid format" }
    ]
  }
}
```

## 数据验证

### Zod Schema 验证

使用 Zod 进行数据验证。

```typescript
import { z } from 'zod';

// 定义验证模式
export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    username: z.string().min(3).max(50),
    password: z.string().min(8).max(100),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    avatar: z.string().url().optional(),
  }),
});
```

### 验证中间件

位置：`src/shared/middleware/validation.ts`

```typescript
import { validate } from '@/shared/middleware/validation';

// 在路由中使用
router.post('/users', 
  validate(createUserSchema), 
  userController.create
);

router.put('/users/:id', 
  validate(updateUserSchema), 
  userController.update
);
```

### 自定义验证规则

```typescript
import { z } from 'zod';

// 密码强度验证
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character');

// 手机号验证
export const phoneSchema = z
  .string()
  .regex(/^1[3-9]\d{9}$/, 'Invalid phone number');

// 日期范围验证
export const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { message: 'End date must be after start date' }
);
```

### 验证错误处理

```typescript
// 验证失败时的响应格式
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid input",
  "data": [
    {
      "message": "body.email is Invalid email format"
    },
    {
      "message": "body.password is Password must be at least 8 characters"
    }
  ]
}
```

## 分页工具

### 分页辅助函数

位置：`src/shared/utils/pagination.ts`

```typescript
interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export async function paginate<T>(
  query: any,
  params: PaginationParams
): Promise<PaginationResult<T>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 10));
  const offset = (page - 1) * pageSize;

  // 执行查询
  const [data, [{ total }]] = await Promise.all([
    query.limit(pageSize).offset(offset),
    db.select({ total: count() }).from(query),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
```

### 使用示例

```typescript
import { paginate } from '@/shared/utils/pagination';

class UserService {
  async findAll(page: number, pageSize: number) {
    const query = db
      .select()
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(desc(users.createdAt));

    return await paginate(query, { page, pageSize });
  }
}

// 控制器中使用
export class UserController {
  async list(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const result = await userService.findAll(page, pageSize);

    res.json(ServiceResponse.success('Users retrieved', result));
  }
}
```

### 分页响应格式

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "data": [
      { "id": "1", "email": "user1@example.com" },
      { "id": "2", "email": "user2@example.com" }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 100,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## 软删除工具

### SoftDeleteHelper

位置：`src/core/database/helpers.ts`

```typescript
export const SoftDeleteHelper = {
  // 查询未删除的记录
  notDeleted: (deletedAtColumn: any) => isNull(deletedAtColumn),
  
  // 软删除数据
  softDelete: () => ({ deletedAt: new Date() }),
  
  // 恢复软删除
  restore: () => ({ deletedAt: null }),
};
```

### 使用示例

```typescript
import { SoftDeleteHelper } from '@/core/database/helpers';

class UserService {
  // 查询活跃用户（未删除）
  async findActive() {
    return await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          SoftDeleteHelper.notDeleted(users.deletedAt)
        )
      );
  }

  // 软删除用户
  async softDelete(userId: string) {
    await db
      .update(users)
      .set(SoftDeleteHelper.softDelete())
      .where(eq(users.id, userId));
  }

  // 恢复用户
  async restore(userId: string) {
    await db
      .update(users)
      .set(SoftDeleteHelper.restore())
      .where(eq(users.id, userId));
  }

  // 永久删除
  async hardDelete(userId: string) {
    await db
      .delete(users)
      .where(eq(users.id, userId));
  }
}
```

### 软删除最佳实践

```typescript
// 1. 在 Schema 中添加 deletedAt 字段
export const users = pgTable('users', {
  id: varchar('id', { length: 128 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  // ...
});

// 2. 创建基础查询方法
class BaseRepository<T> {
  protected baseQuery() {
    return db
      .select()
      .from(this.table)
      .where(SoftDeleteHelper.notDeleted(this.table.deletedAt));
  }
}

// 3. 在服务中使用
class UserService extends BaseRepository<User> {
  async findById(id: string) {
    return this.baseQuery()
      .where(eq(users.id, id))
      .limit(1);
  }
}
```

## 其他实用工具

### 异步处理包装器

```typescript
// 自动捕获异步错误
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 使用
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  res.json(ServiceResponse.success('User found', user));
}));
```

### 日期格式化

```typescript
import dayjs from 'dayjs';

// 格式化日期
export const formatDate = (date: Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(date).format(format);
};

// 相对时间
export const relativeTime = (date: Date) => {
  return dayjs(date).fromNow();
};

// 日期范围
export const isInRange = (date: Date, start: Date, end: Date) => {
  const d = dayjs(date);
  return d.isAfter(start) && d.isBefore(end);
};
```

### 对象工具

```typescript
// 移除对象中的 undefined 和 null 值
export const removeEmpty = (obj: Record<string, any>) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);
};

// 深度克隆
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// 对象差异
export const diff = (obj1: any, obj2: any) => {
  const changes: Record<string, any> = {};
  
  Object.keys(obj2).forEach(key => {
    if (obj1[key] !== obj2[key]) {
      changes[key] = {
        old: obj1[key],
        new: obj2[key],
      };
    }
  });
  
  return changes;
};
```

### 字符串工具

```typescript
// 生成随机字符串
export const randomString = (length: number) => {
  return nanoid(length);
};

// 截断字符串
export const truncate = (str: string, length: number) => {
  return str.length > length ? str.slice(0, length) + '...' : str;
};

// 转换为 slug
export const slugify = (str: string) => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};
```

## 相关文档

- [Zod 文档](https://zod.dev/)
- [Day.js 文档](https://day.js.org/)
- [异常处理最佳实践](https://expressjs.com/en/guide/error-handling.html)
