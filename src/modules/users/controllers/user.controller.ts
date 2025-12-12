/**
 * 用户控制器
 */
import type { Request, Response } from 'express';
import { Controller, Get, Auth, Validate } from '@/core/router';
import { userRepository } from '../repositories/user.repository';
import { paginationQuerySchema } from '@/shared/schemas/pagination.schema';
import { getLogger } from '@/core/logger';

const logger = getLogger();

@Controller('/users', {
  description: '用户管理接口',
})
export class UserController {
  /**
   * 获取用户列表（分页）
   */
  @Auth()
  @Validate(paginationQuerySchema)
  @Get('/', {
    description: '获取用户列表',
  })
  async list(req: Request, res: Response): Promise<void> {
    const { page, limit } = req.query;

    const result = await userRepository.findPaginated({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      includeDeleted: false,
    });

    logger.info('User list retrieved', {
      page: result.meta.page,
      total: result.meta.total,
    });

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  }

  /**
   * 获取用户详情
   */
  @Auth()
  @Get('/:id', {
    description: '获取用户详情',
  })
  async get(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const user = await userRepository.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // 移除敏感信息
    const { password: _password1, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword,
    });
  }

  /**
   * 获取当前用户的详细信息
   */
  @Auth()
  @Get('/me/profile', {
    description: '获取当前用户详细信息',
  })
  async getProfile(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const user = await userRepository.findWithRolesAndPermissions(req.user.sub);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // 移除敏感信息
    const { password: _password2, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword,
    });
  }
}
