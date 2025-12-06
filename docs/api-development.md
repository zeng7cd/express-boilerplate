# API 开发指南

本文档介绍如何在项目中开发 RESTful API。

## 目录

- [项目结构](#项目结构)
- [创建新模块](#创建新模块)
- [开发流程](#开发流程)
- [API 设计规范](#api-设计规范)
- [错误处理](#错误处理)
- [测试](#测试)

## 项目结构

```
src/
├── modules/              # 业务模块
│   └── [module]/
│       ├── routes.ts     # 路由定义
│       ├── controllers/  # 控制器
│       ├── services/     # 业务逻辑
│       ├── repositories/ # 数据访问
│       ├── dto/          # 数据传输对象
│       └── types/        # 类型定义
├── core/                 # 核心功能
│   ├── database/         # 数据库
│   ├── cache/            # 缓存
│   ├── config/           # 配置
│   ├── logger/           # 日志
│   └── router/           # 路由注册器
├── shared/               # 共享资源
│   ├── middleware/       # 中间件
│   ├── utils/            # 工具函数
│   └── types/            # 共享类型
└── api/
    └── routes.ts         # 路由聚合
```

## 创建新模块

### 1. 创建模块目录

```bash
mkdir -p src/modules/posts/{controllers,services,repositories,dto,types}
```

### 2. 定义数据模型

在 `prisma/schema.prisma` 中添加模型：

```prisma
model Post {
  id        String   @id @default(cuid())
  title     String
  content   String
  authorId  String
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  author User @relation(fields: [authorId], references: [id])

  @@index([authorId])
  @@index([published])
  @@map("posts")
}
```

运行迁移：

```bash
pnpm db:migrate
```

### 3. 创建 DTO

```typescript
// src/modules/posts/dto/create-post.dto.ts
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  published: z.boolean().optional().default(false),
});

export type CreatePostDto = z.infer<typeof createPostSchema>;
```

```typescript
// src/modules/posts/dto/update-post.dto.ts
import { z } from 'zod';

export const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  published: z.boolean().optional(),
});

export type UpdatePostDto = z.infer<typeof updatePostSchema>;
```

### 4. 创建 Repository

```typescript
// src/modules/posts/repositories/post.repository.ts
import { prisma } from '@/core/database';
import type { CreatePostDto, UpdatePostDto } from '../dto';

export class PostRepository {
  async findAll(authorId?: string) {
    return prisma.post.findMany({
      where: authorId ? { authorId } : undefined,
      include: { author: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.post.findUnique({
      where: { id },
      include: { author: { select: { id: true, username: true } } },
    });
  }

  async create(authorId: string, data: CreatePostDto) {
    return prisma.post.create({
      data: { ...data, authorId },
      include: { author: { select: { id: true, username: true } } },
    });
  }

  async update(id: string, data: UpdatePostDto) {
    return prisma.post.update({
      where: { id },
      data,
      include: { author: { select: { id: true, username: true } } },
    });
  }

  async delete(id: string) {
    return prisma.post.delete({ where: { id } });
  }

  async findByAuthor(authorId: string) {
    return prisma.post.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const postRepository = new PostRepository();
```

### 5. 创建 Service

```typescript
// src/modules/posts/services/post.service.ts
import { postRepository } from '../repositories/post.repository';
import type { CreatePostDto, UpdatePostDto } from '../dto';

export class PostService {
  async getAllPosts(authorId?: string) {
    return postRepository.findAll(authorId);
  }

  async getPostById(id: string) {
    const post = await postRepository.findById(id);
    if (!post) {
      throw new Error('Post not found');
    }
    return post;
  }

  async createPost(authorId: string, data: CreatePostDto) {
    return postRepository.create(authorId, data);
  }

  async updatePost(id: string, authorId: string, data: UpdatePostDto) {
    const post = await postRepository.findById(id);
    
    if (!post) {
      throw new Error('Post not found');
    }
    
    if (post.authorId !== authorId) {
      throw new Error('Unauthorized');
    }
    
    return postRepository.update(id, data);
  }

  async deletePost(id: string, authorId: string) {
    const post = await postRepository.findById(id);
    
    if (!post) {
      throw new Error('Post not found');
    }
    
    if (post.authorId !== authorId) {
      throw new Error('Unauthorized');
    }
    
    return postRepository.delete(id);
  }

  async getUserPosts(authorId: string) {
    return postRepository.findByAuthor(authorId);
  }
}

export const postService = new PostService();
```

### 6. 创建 Controller

```typescript
// src/modules/posts/controllers/post.controller.ts
import type { Request, Response } from 'express';
import { postService } from '../services/post.service';
import { createPostSchema, updatePostSchema } from '../dto';
import { ServiceResponse } from '@/shared/utils/serviceResponse';

export class PostController {
  async list(req: Request, res: Response) {
    try {
      const { authorId } = req.query;
      const posts = await postService.getAllPosts(authorId as string);
      const response = ServiceResponse.success('Posts retrieved', posts);
      res.status(response.statusCode).json(response);
    } catch (error) {
      const response = ServiceResponse.failure('Failed to retrieve posts', null);
      res.status(response.statusCode).json(response);
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const post = await postService.getPostById(req.params.id);
      const response = ServiceResponse.success('Post retrieved', post);
      res.status(response.statusCode).json(response);
    } catch (error) {
      const response = ServiceResponse.failure('Post not found', null, 404);
      res.status(response.statusCode).json(response);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const data = createPostSchema.parse(req.body);
      const post = await postService.createPost(req.user!.sub, data);
      const response = ServiceResponse.success('Post created', post, 201);
      res.status(response.statusCode).json(response);
    } catch (error) {
      const response = ServiceResponse.failure('Failed to create post', null);
      res.status(response.statusCode).json(response);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const data = updatePostSchema.parse(req.body);
      const post = await postService.updatePost(req.params.id, req.user!.sub, data);
      const response = ServiceResponse.success('Post updated', post);
      res.status(response.statusCode).json(response);
    } catch (error) {
      const response = ServiceResponse.failure('Failed to update post', null);
      res.status(response.statusCode).json(response);
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await postService.deletePost(req.params.id, req.user!.sub);
      const response = ServiceResponse.success('Post deleted', null);
      res.status(response.statusCode).json(response);
    } catch (error) {
      const response = ServiceResponse.failure('Failed to delete post', null);
      res.status(response.statusCode).json(response);
    }
  }
}

export const postController = new PostController();
```

### 7. 创建路由

```typescript
// src/modules/posts/routes.ts
import { Router } from 'express';
import { postController } from './controllers/post.controller';
import { authenticateJWT } from '@/shared/middleware/auth.middleware';

const router = Router();

// 公开路由
router.get('/', postController.list.bind(postController));
router.get('/:id', postController.getById.bind(postController));

// 需要认证的路由
router.post('/', authenticateJWT, postController.create.bind(postController));
router.put('/:id', authenticateJWT, postController.update.bind(postController));
router.delete('/:id', authenticateJWT, postController.delete.bind(postController));

export default router;
```

### 8. 注册路由

在 `src/api/routes.ts` 中添加：

```typescript
import postRoutes from '@/modules/posts/routes';

router.use('/posts', postRoutes);
```

## 开发流程

### 1. 需求分析

- 确定 API 端点
- 定义请求/响应格式
- 确定权限要求

### 2. 数据建模

- 设计数据库表结构
- 定义关系
- 添加索引

### 3. 实现层次

```
Controller (处理 HTTP 请求/响应)
    ↓
Service (业务逻辑)
    ↓
Repository (数据访问)
    ↓
Database (Prisma)
```

### 4. 测试

- 单元测试（Service 层）
- 集成测试（API 端点）

## API 设计规范

### RESTful 端点

```
GET    /api/posts          # 获取列表
GET    /api/posts/:id      # 获取单个
POST   /api/posts          # 创建
PUT    /api/posts/:id      # 更新
DELETE /api/posts/:id      # 删除
```

### 请求格式

```typescript
// POST /api/posts
{
  "title": "My Post",
  "content": "Post content",
  "published": false
}
```

### 响应格式

```typescript
// 成功响应
{
  "success": true,
  "message": "Post created",
  "data": {
    "id": "clx123",
    "title": "My Post",
    "content": "Post content",
    "published": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "statusCode": 201
}

// 错误响应
{
  "success": false,
  "message": "Post not found",
  "data": null,
  "statusCode": 404
}
```

### 分页

```typescript
// GET /api/posts?page=1&limit=10
{
  "success": true,
  "message": "Posts retrieved",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

### 过滤和排序

```
GET /api/posts?published=true&sort=createdAt&order=desc
```

## 错误处理

### 自定义错误类

```typescript
// src/shared/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
  }
}
```

### 使用错误类

```typescript
// Service 层
async getPostById(id: string) {
  const post = await postRepository.findById(id);
  if (!post) {
    throw new NotFoundError('Post');
  }
  return post;
}

// Controller 层
async getById(req: Request, res: Response, next: NextFunction) {
  try {
    const post = await postService.getPostById(req.params.id);
    const response = ServiceResponse.success('Post retrieved', post);
    res.status(response.statusCode).json(response);
  } catch (error) {
    next(error); // 传递给全局错误处理器
  }
}
```

## 验证

### 使用 Zod

```typescript
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  published: z.boolean().optional().default(false),
});

// 在 Controller 中验证
const data = createPostSchema.parse(req.body);
```

### 验证中间件

```typescript
import { validate } from '@/shared/middleware/validate.middleware';

router.post('/', authenticateJWT, validate(createPostSchema), controller.create);
```

## 测试

### 单元测试

```typescript
// test/unit/posts/post.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { postService } from '@/modules/posts/services/post.service';
import { postRepository } from '@/modules/posts/repositories/post.repository';

vi.mock('@/modules/posts/repositories/post.repository');

describe('PostService', () => {
  it('should get post by id', async () => {
    const mockPost = { id: '1', title: 'Test', content: 'Content' };
    vi.mocked(postRepository.findById).mockResolvedValue(mockPost);

    const result = await postService.getPostById('1');
    
    expect(result).toEqual(mockPost);
    expect(postRepository.findById).toHaveBeenCalledWith('1');
  });

  it('should throw error when post not found', async () => {
    vi.mocked(postRepository.findById).mockResolvedValue(null);

    await expect(postService.getPostById('1')).rejects.toThrow('Post not found');
  });
});
```

### 集成测试

```typescript
// test/integration/posts/posts.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '@/server';

describe('POST /api/posts', () => {
  let app: Express;
  let token: string;

  beforeAll(async () => {
    app = await createApp();
    // 获取测试 token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    token = res.body.data.accessToken;
  });

  it('should create a post', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Post',
        content: 'Test content',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
  });

  it('should return 401 without token', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({
        title: 'Test Post',
        content: 'Test content',
      });

    expect(res.status).toBe(401);
  });
});
```

## 最佳实践

### 1. 分层架构

- Controller：处理 HTTP 请求/响应
- Service：业务逻辑
- Repository：数据访问
- 不要在 Controller 中写业务逻辑
- 不要在 Service 中直接使用 Prisma

### 2. 错误处理

- 使用自定义错误类
- 在 Service 层抛出错误
- 在 Controller 层捕获并传递给全局错误处理器

### 3. 验证

- 使用 Zod 定义 schema
- 在 Controller 层验证输入
- 创建 DTO 类型

### 4. 安全

- 使用 JWT 认证
- 实现权限控制
- 验证用户身份
- 防止 SQL 注入（Prisma 自动处理）

### 5. 性能

- 使用索引
- 实现缓存
- 分页查询
- 只查询需要的字段

### 6. 文档

- 使用 Swagger/OpenAPI
- 编写清晰的注释
- 提供示例

## 相关文档

- [Router 使用指南](./router-guide.md)
- [Prisma 使用指南](./prisma-guide.md)
- [中间件使用指南](./middleware-guide.md)
