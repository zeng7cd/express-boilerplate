/**
 * 角色控制器
 */
import { getAppPinoLogger } from '@/core/logger/pino';
import { Controller, Get, Post, Auth, Validate } from '@/core/router';
import { ServiceResponse } from '@/shared/utils/serviceResponse';

import {
  createRoleSchema,
  updateRoleSchema,
  roleIdSchema,
  assignPermissionsSchema,
  roleListQuerySchema,
} from '../schemas';
import { roleService } from '../services/role.service';

import type { Request, Response } from 'express';

const logger = getAppPinoLogger();

@Controller('/roles', {
  description: '角色管理接口',
})
export class RoleController {
  /**
   * 获取角色列表
   * GET /api/roles
   */
  @Auth()
  @Validate(roleListQuerySchema)
  @Get('/', {
    description: '获取角色列表',
  })
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, includeInactive } = req.query;

      const result = await roleService.getRoles({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        search: search as string,
        includeInactive: includeInactive === 'true',
      });

      logger.info(
        {
          page: result.pagination.page,
          total: result.pagination.total,
        },
        'Role list retrieved',
      );

      const response = ServiceResponse.success('Role list retrieved successfully', {
        roles: result.roles,
        pagination: result.pagination,
      });
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch roles');
      const response = ServiceResponse.failure('Failed to fetch roles', null, 500);
      res.status(response.statusCode).json(response);
    }
  }

  /**
   * 获取角色详情
   * GET /api/roles/:id
   */
  @Auth()
  @Validate(roleIdSchema)
  @Get('/:id', {
    description: '获取角色详情',
  })
  async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const role = await roleService.getRoleById(id);

      if (!role) {
        const response = ServiceResponse.failure('Role not found', null, 404);
        res.status(response.statusCode).json(response);
        return;
      }

      const response = ServiceResponse.success('Role retrieved successfully', role);
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch role');
      const response = ServiceResponse.failure('Failed to fetch role', null, 500);
      res.status(response.statusCode).json(response);
    }
  }

  /**
   * 创建角色
   * POST /api/roles
   */
  @Auth()
  @Validate(createRoleSchema)
  @Post('/', {
    description: '创建角色',
  })
  async create(req: Request, res: Response): Promise<void> {
    try {
      const role = await roleService.createRole(req.body);

      const response = ServiceResponse.success('Role created successfully', role, 201);
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error({ err: error }, 'Failed to create role');

      if ((error as Error).message === 'Role with this name already exists') {
        const response = ServiceResponse.failure((error as Error).message, null, 409);
        res.status(response.statusCode).json(response);
        return;
      }

      const response = ServiceResponse.failure('Failed to create role', null, 400);
      res.status(response.statusCode).json(response);
    }
  }

  /**
   * 更新角色
   * POST /api/roles/:id/update
   */
  @Auth()
  @Validate(updateRoleSchema)
  @Post('/:id/update', {
    description: '更新角色',
  })
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const role = await roleService.updateRole(id, req.body);

      const response = ServiceResponse.success('Role updated successfully', role);
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error({ err: error }, 'Failed to update role');

      if ((error as Error).message === 'Role not found') {
        const response = ServiceResponse.failure((error as Error).message, null, 404);
        res.status(response.statusCode).json(response);
        return;
      }

      const response = ServiceResponse.failure('Failed to update role', null, 400);
      res.status(response.statusCode).json(response);
    }
  }

  /**
   * 删除角色
   * POST /api/roles/:id/delete
   */
  @Auth()
  @Validate(roleIdSchema)
  @Post('/:id/delete', {
    description: '删除角色',
  })
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await roleService.deleteRole(id);

      const response = ServiceResponse.success('Role deleted successfully', null);
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete role');

      if ((error as Error).message === 'Role not found') {
        const response = ServiceResponse.failure((error as Error).message, null, 404);
        res.status(response.statusCode).json(response);
        return;
      }

      const response = ServiceResponse.failure('Failed to delete role', null, 500);
      res.status(response.statusCode).json(response);
    }
  }

  /**
   * 激活角色
   * POST /api/roles/:id/activate
   */
  @Auth()
  @Validate(roleIdSchema)
  @Post('/:id/activate', {
    description: '激活角色',
  })
  async activate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const role = await roleService.activateRole(id);

      const response = ServiceResponse.success('Role activated successfully', role);
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error({ err: error }, 'Failed to activate role');

      if ((error as Error).message === 'Role not found') {
        const response = ServiceResponse.failure((error as Error).message, null, 404);
        res.status(response.statusCode).json(response);
        return;
      }

      const response = ServiceResponse.failure('Failed to activate role', null, 500);
      res.status(response.statusCode).json(response);
    }
  }

  /**
   * 停用角色
   * POST /api/roles/:id/deactivate
   */
  @Auth()
  @Validate(roleIdSchema)
  @Post('/:id/deactivate', {
    description: '停用角色',
  })
  async deactivate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const role = await roleService.deactivateRole(id);

      const response = ServiceResponse.success('Role deactivated successfully', role);
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error({ err: error }, 'Failed to deactivate role');

      if ((error as Error).message === 'Role not found') {
        const response = ServiceResponse.failure((error as Error).message, null, 404);
        res.status(response.statusCode).json(response);
        return;
      }

      const response = ServiceResponse.failure('Failed to deactivate role', null, 500);
      res.status(response.statusCode).json(response);
    }
  }

  /**
   * 获取角色的权限列表
   * GET /api/roles/:id/permissions
   */
  @Auth()
  @Validate(roleIdSchema)
  @Get('/:id/permissions', {
    description: '获取角色的权限列表',
  })
  async getPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const permissions = await roleService.getRolePermissions(id);

      const response = ServiceResponse.success('Role permissions retrieved successfully', permissions);
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch role permissions');

      if ((error as Error).message === 'Role not found') {
        const response = ServiceResponse.failure((error as Error).message, null, 404);
        res.status(response.statusCode).json(response);
        return;
      }

      const response = ServiceResponse.failure('Failed to fetch role permissions', null, 500);
      res.status(response.statusCode).json(response);
    }
  }

  /**
   * 分配权限给角色
   * POST /api/roles/:id/permissions
   */
  @Auth()
  @Validate(assignPermissionsSchema)
  @Post('/:id/permissions', {
    description: '分配权限给角色',
  })
  async assignPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { permissionIds } = req.body;

      await roleService.assignPermissions(id, permissionIds);

      const response = ServiceResponse.success('Permissions assigned successfully', null);
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error({ err: error }, 'Failed to assign permissions');

      if ((error as Error).message === 'Role not found') {
        const response = ServiceResponse.failure((error as Error).message, null, 404);
        res.status(response.statusCode).json(response);
        return;
      }

      const response = ServiceResponse.failure('Failed to assign permissions', null, 400);
      res.status(response.statusCode).json(response);
    }
  }
}
