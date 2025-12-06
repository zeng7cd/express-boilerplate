/**
 * 用户数据传输对象
 * 用于控制返回给客户端的用户信息，避免暴露敏感数据
 */
import type { User } from '@/core/database';

export interface UserDto {
  id: string;
  email: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserDtoMapper {
  /**
   * 从数据库实体创建 DTO
   */
  static fromEntity(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * 批量转换
   */
  static fromEntities(users: User[]): UserDto[] {
    return users.map((user) => UserDtoMapper.fromEntity(user));
  }

  /**
   * 简化版本（用于列表展示）
   */
  static toSimple(user: User): Pick<UserDto, 'id' | 'email' | 'username' | 'avatar'> {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
    };
  }
}

export interface UserWithRolesDto extends UserDto {
  roles: string[];
  permissions?: string[];
}

export class UserWithRolesDtoMapper {
  static fromEntityWithRoles(user: User & { userRoles: any[] }): UserWithRolesDto {
    const baseDto = UserDtoMapper.fromEntity(user);

    const roles = user.userRoles.map((ur: any) => ur.role.name);
    const permissions = user.userRoles.flatMap(
      (ur: any) => ur.role.rolePermissions?.map((rp: any) => rp.permission.name) || [],
    );

    return {
      ...baseDto,
      roles,
      permissions: [...new Set(permissions)], // 去重
    };
  }
}
