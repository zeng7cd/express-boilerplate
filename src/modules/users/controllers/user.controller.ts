/**
 * 用户控制器
 */
import { getAppPinoLogger } from '@/core/logger/pino';
import { Controller, Get, Auth, Validate } from '@/core/router';
import { paginationQuerySchema } from '@/shared/schemas/pagination.schema';
import { ServiceResponse } from '@/shared/utils/serviceResponse';

import { userRepository } from '../repositories/user.repository';

import type { Request, Response } from 'express';

const logger = getAppPinoLogger();

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

    logger.info(
      {
        page: result.meta.page,
        total: result.meta.total,
      },
      'User list retrieved',
    );

    const response = ServiceResponse.success('User list retrieved successfully', {
      users: result.data,
      meta: result.meta,
    });
    res.status(response.statusCode).json(response);
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
      const response = ServiceResponse.failure('User not found', null, 404);
      res.status(response.statusCode).json(response);
      return;
    }

    // 移除敏感信息
    const { password: _password1, ...userWithoutPassword } = user;

    const response = ServiceResponse.success('User retrieved successfully', userWithoutPassword);
    res.status(response.statusCode).json(response);
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
      const response = ServiceResponse.failure('Authentication required', null, 401);
      res.status(response.statusCode).json(response);
      return;
    }

    const user = await userRepository.findWithRolesAndPermissions(req.user.sub);

    if (!user) {
      const response = ServiceResponse.failure('User not found', null, 404);
      res.status(response.statusCode).json(response);
      return;
    }

    // 移除敏感信息
    const { password: _password2, ...userWithoutPassword } = user;

    const response = ServiceResponse.success('User profile retrieved successfully', userWithoutPassword);
    res.status(response.statusCode).json(response);
  }
}
