/**
 * 角色数据传输对象
 */
import type { Role } from '@/core/database';

export interface RoleDto {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class RoleDtoMapper {
  /**
   * 从数据库实体创建 DTO
   */
  static fromEntity(role: Role): RoleDto {
    return {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isActive: role.isActive,
      version: role.version,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  /**
   * 批量转换
   */
  static fromEntities(roles: Role[]): RoleDto[] {
    return roles.map((role) => RoleDtoMapper.fromEntity(role));
  }
}

export interface RoleWithPermissionsDto extends RoleDto {
  permissions: {
    id: string;
    name: string;
    resource: string;
    action: string;
    description?: string | null;
  }[];
}

export class RoleWithPermissionsDtoMapper {
  static fromEntityWithPermissions(role: any): RoleWithPermissionsDto {
    const baseDto = RoleDtoMapper.fromEntity(role);

    const permissionsList =
      role.rolePermissions?.map((rp: any) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description,
      })) || [];

    return {
      ...baseDto,
      permissions: permissionsList,
    };
  }
}
