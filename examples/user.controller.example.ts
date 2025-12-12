/**
 * 用户控制器示例
 * 展示如何使用装饰器路由系统
 */
import type { Request, Response } from 'express';
import { Controller, Get, Post, Put, Delete, Auth, Public } from '@/core/router';

/**
 * 用户控制器
 *
 * 路由前缀: /api/users
 * 所有路由都需要认证（除非标记为 @Public）
 */
@Controller('/users', {
  description: '用户管理接口',
})
export class UserController {
  /**
   * 获取用户列表
   * GET /api/users
   */
  @Auth()
  @Get('/', {
    description: '获取用户列表',
  })
  async list(req: Request, res: Response): Promise<void> {
    try {
      // 模拟获取用户列表
      const users = [
        { id: 1, username: 'user1', email: 'user1@example.com' },
        { id: 2, username: 'user2', email: 'user2@example.com' },
      ];

      res.json({
        success: true,
        data: users,
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
      });
    }
  }

  /**
   * 获取单个用户
   * GET /api/users/:id
   */
  @Auth()
  @Get('/:id', {
    description: '获取用户详情',
  })
  async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // 模拟获取用户
      const user = {
        id: Number(id),
        username: `user${id}`,
        email: `user${id}@example.com`,
      };

      res.json({
        success: true,
        data: user,
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
      });
    }
  }

  /**
   * 创建用户（公开接口）
   * POST /api/users
   */
  @Public()
  @Post('/', {
    description: '创建用户',
  })
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { username, email } = req.body;

      // 模拟创建用户
      const user = {
        id: Date.now(),
        username,
        email,
      };

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    } catch (_error) {
      res.status(400).json({
        success: false,
        message: 'Failed to create user',
      });
    }
  }

  /**
   * 更新用户
   * PUT /api/users/:id
   */
  @Auth()
  @Put('/:id', {
    description: '更新用户信息',
  })
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { username, email } = req.body;

      // 模拟更新用户
      const user = {
        id: Number(id),
        username,
        email,
      };

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (_error) {
      res.status(400).json({
        success: false,
        message: 'Failed to update user',
      });
    }
  }

  /**
   * 删除用户
   * DELETE /api/users/:id
   */
  @Auth()
  @Delete('/:id', {
    description: '删除用户',
  })
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // 模拟删除用户
      res.json({
        success: true,
        message: `User ${id} deleted successfully`,
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
      });
    }
  }

  /**
   * 获取用户的文章
   * GET /api/users/:userId/posts
   */
  @Auth()
  @Get('/:userId/posts', {
    description: '获取用户的文章列表',
  })
  async getUserPosts(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // 模拟获取用户文章
      const posts = [
        { id: 1, title: 'Post 1', userId: Number(userId) },
        { id: 2, title: 'Post 2', userId: Number(userId) },
      ];

      res.json({
        success: true,
        data: posts,
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user posts',
      });
    }
  }
}

/**
 * 使用说明：
 *
 * 1. 将此文件复制到 src/modules/users/controllers/user.controller.ts
 * 2. 在 src/controllers.ts 中导入：
 *    import './modules/users/controllers/user.controller';
 * 3. 启动应用，路由会自动注册
 *
 * 生成的路由：
 * - GET    /api/users           - 获取用户列表（需要认证）
 * - GET    /api/users/:id       - 获取用户详情（需要认证）
 * - POST   /api/users           - 创建用户（公开）
 * - PUT    /api/users/:id       - 更新用户（需要认证）
 * - DELETE /api/users/:id       - 删除用户（需要认证）
 * - GET    /api/users/:userId/posts - 获取用户文章（需要认证）
 */
