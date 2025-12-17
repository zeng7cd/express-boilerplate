/**
 * 角色服务
 */
import { createId } from '@paralleldrive/cuid2';

import { getAppPinoLogger } from '@/core/logger/pino';

import { RoleWithPermissionsDtoMapper } from '../dtos/role.dto';
import type { RoleRepository } from '../repositories/role.repository';

import type { RoleWithPermissionsDto } from '../dtos/role.dto';

export interface CreateRoleRequest {
  name: string;
  displayName: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleRequest {
  displayName?: string;
  description?: string;
  isActive?: boolean;
  permissionIds?: string[];
}

export interface RoleListQuery {
  page?: number;
  limit?: number;
  search?: string;
  includeInactive?: boolean;
}

export class RoleService {
  private readonly logger = getAppPinoLogger();

  constructor(private readonly roleRepository: RoleRepository) {}
  /**
   * 创建角色
   */
  async createRole(data: CreateRoleRequest): Promise<RoleWithPermissionsDto> {
    // 检查角色名称是否已存在
    const existingRole = await this.roleRepository.findByName(data.name);
    if (existingRole) {
      throw new Error('Role with this name already exists');
    }

    // 创建角色
    const roleId = createId();
    const role = await this.roleRepository.createRole({
      id: roleId,
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      isActive: true,
    });

    // 分配权限
    if (data.permissionIds && data.permissionIds.length > 0) {
      await this.roleRepository.assignPermissions(role.id, data.permissionIds);
    }

    this.logger.info({ roleId: role.id, name: role.name }, 'Role created');

    // 重新查询角色以获取完整信息
    const createdRole = await this.roleRepository.findWithPermissions(role.id);
    if (!createdRole) {
      throw new Error('Failed to retrieve created role');
    }
    return RoleWithPermissionsDtoMapper.fromEntityWithPermissions(createdRole);
  }

  /**
   * 获取角色列表
   */
  async getRoles(query: RoleListQuery): Promise<{
    roles: RoleWithPermissionsDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    let rolesList;

    if (query.search) {
      rolesList = await this.roleRepository.search(query.search);
    } else {
      rolesList = await this.roleRepository.findAllWithPermissions({
        includeInactive: query.includeInactive,
      });
    }

    // 手动分页
    const total = rolesList.length;
    const offset = (page - 1) * limit;
    const paginatedRoles = rolesList.slice(offset, offset + limit);

    return {
      roles: paginatedRoles.map((role) => RoleWithPermissionsDtoMapper.fromEntityWithPermissions(role)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 根据ID获取角色
   */
  async getRoleById(id: string): Promise<RoleWithPermissionsDto | null> {
    const role = await this.roleRepository.findWithPermissions(id);
    return role ? RoleWithPermissionsDtoMapper.fromEntityWithPermissions(role) : null;
  }

  /**
   * 更新角色
   */
  async updateRole(id: string, data: UpdateRoleRequest): Promise<RoleWithPermissionsDto> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }

    // 更新角色基本信息
    if (data.displayName !== undefined || data.description !== undefined || data.isActive !== undefined) {
      const updateData: Partial<typeof role> = {};

      if (data.displayName !== undefined) {
        updateData.displayName = data.displayName;
      }
      if (data.description !== undefined) {
        updateData.description = data.description;
      }
      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
      }

      await this.roleRepository.update(id, updateData);
    }

    // 更新权限
    if (data.permissionIds !== undefined) {
      await this.roleRepository.assignPermissions(id, data.permissionIds);
    }

    this.logger.info({ roleId: id }, 'Role updated');

    // 重新查询角色以获取完整信息
    const updatedRole = await this.roleRepository.findWithPermissions(id);
    if (!updatedRole) {
      throw new Error('Failed to retrieve updated role');
    }
    return RoleWithPermissionsDtoMapper.fromEntityWithPermissions(updatedRole);
  }

  /**
   * 删除角色（软删除）
   */
  async deleteRole(id: string): Promise<void> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }

    await this.roleRepository.softDelete(id);
    this.logger.info({ roleId: id }, 'Role deleted');
  }

  /**
   * 激活角色
   */
  async activateRole(id: string): Promise<RoleWithPermissionsDto> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }

    await this.roleRepository.activate(id);
    this.logger.info({ roleId: id }, 'Role activated');

    const activatedRole = await this.roleRepository.findWithPermissions(id);
    if (!activatedRole) {
      throw new Error('Failed to retrieve activated role');
    }
    return RoleWithPermissionsDtoMapper.fromEntityWithPermissions(activatedRole);
  }

  /**
   * 停用角色
   */
  async deactivateRole(id: string): Promise<RoleWithPermissionsDto> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }

    await this.roleRepository.deactivate(id);
    this.logger.info({ roleId: id }, 'Role deactivated');

    const deactivatedRole = await this.roleRepository.findWithPermissions(id);
    if (!deactivatedRole) {
      throw new Error('Failed to retrieve deactivated role');
    }
    return RoleWithPermissionsDtoMapper.fromEntityWithPermissions(deactivatedRole);
  }

  /**
   * 获取角色的权限列表
   */
  async getRolePermissions(id: string) {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }

    return this.roleRepository.getPermissions(id);
  }

  /**
   * 分配权限给角色
   */
  async assignPermissions(id: string, permissionIds: string[]): Promise<void> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }

    await this.roleRepository.assignPermissions(id, permissionIds);
    this.logger.info({ roleId: id, permissionCount: permissionIds.length }, 'Permissions assigned to role');
  }
}

// 延迟初始化单例，避免循环依赖
let roleServiceInstance: RoleService | null = null;

export const getRoleService = (): RoleService => {
  if (!roleServiceInstance) {
    const { roleRepository } = require('../repositories/role.repository');
    roleServiceInstance = new RoleService(roleRepository);
  }
  return roleServiceInstance;
};

// 向后兼容的导出
export const roleService = new Proxy({} as RoleService, {
  get(_target, prop) {
    return getRoleService()[prop as keyof RoleService];
  },
});
