/**
 * 用户服务
 */
import { createId } from '@paralleldrive/cuid2';
import * as bcrypt from 'bcryptjs';
import { eq, or, and, ilike, desc, count } from 'drizzle-orm';

import { env } from '@/core/config/env';
import { db, users, roles, userRoles } from '@/core/database';
import type { UserRepository } from '@/modules/users/repositories/user.repository';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserResponse,
  UserListQuery,
  UserListResponse,
  ChangePasswordRequest,
} from '@/shared/types/user';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}
  /**
   * 创建用户
   */
  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    // 检查用户是否已存在
    const existingUser = await this.userRepository.findByEmailOrUsername(data.email, data.username);

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

    // 生成用户 ID
    const userId = createId();

    // 创建用户
    await db.insert(users).values({
      id: userId,
      email: data.email,
      username: data.username,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    // 查询创建的用户
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    // 分配角色
    if (data.roleIds && data.roleIds.length > 0) {
      await this.assignRoles(user.id, data.roleIds);
    } else {
      // 分配默认角色
      const defaultRole = await db.query.roles.findFirst({
        where: eq(roles.name, 'user'),
      });

      if (defaultRole) {
        await db.insert(userRoles).values({
          userId: user.id,
          roleId: defaultRole.id,
        });
      }
    }

    // 重新查询用户以获取完整信息
    const createdUser = await this.getUserById(user.id);
    if (!createdUser) {
      throw new Error('Failed to retrieve created user');
    }
    return createdUser;
  }

  /**
   * 获取用户列表
   */
  async getUsers(query: UserListQuery): Promise<UserListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions = [];

    if (query.search) {
      conditions.push(
        or(
          ilike(users.email, `%${query.search}%`),
          ilike(users.username, `%${query.search}%`),
          ilike(users.firstName, `%${query.search}%`),
          ilike(users.lastName, `%${query.search}%`),
        ),
      );
    }

    if (query.isActive !== undefined) {
      conditions.push(eq(users.isActive, query.isActive));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 获取用户列表
    const usersList = await db.query.users.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: desc(users.createdAt),
      with: {
        userRoles: {
          with: {
            role: {
              with: {
                rolePermissions: {
                  with: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 获取总数
    const [{ value: total }] = await db.select({ value: count() }).from(users).where(whereClause);

    return {
      users: usersList.map((user) => this.formatUserResponse(user)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 根据ID获取用户
   */
  async getUserById(id: string): Promise<UserResponse | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        userRoles: {
          with: {
            role: {
              with: {
                rolePermissions: {
                  with: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return user ? this.formatUserResponse(user) : null;
  }

  /**
   * 更新用户
   */
  async updateUser(id: string, data: UpdateUserRequest): Promise<UserResponse> {
    const user = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!user) {
      throw new Error('User not found');
    }

    // 更新用户基本信息
    await db
      .update(users)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        avatar: data.avatar,
        isActive: data.isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    // 更新角色
    if (data.roleIds) {
      await this.assignRoles(id, data.roleIds);
    }

    const updatedUser = await this.getUserById(id);
    if (!updatedUser) {
      throw new Error('Failed to retrieve updated user');
    }
    return updatedUser;
  }

  /**
   * 删除用户
   */
  async deleteUser(id: string): Promise<void> {
    const user = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!user) {
      throw new Error('User not found');
    }

    await db.delete(users).where(eq(users.id, id));
  }

  /**
   * 修改密码
   */
  async changePassword(id: string, data: ChangePasswordRequest): Promise<void> {
    const user = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!user) {
      throw new Error('User not found');
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // 加密新密码
    const hashedNewPassword = await bcrypt.hash(data.newPassword, env.BCRYPT_ROUNDS);

    // 更新密码
    await db.update(users).set({ password: hashedNewPassword }).where(eq(users.id, id));
  }

  /**
   * 分配角色
   */
  private async assignRoles(userId: string, roleIds: string[]): Promise<void> {
    // 删除现有角色
    await db.delete(userRoles).where(eq(userRoles.userId, userId));

    // 分配新角色
    if (roleIds.length > 0) {
      await db.insert(userRoles).values(
        roleIds.map((roleId) => ({
          userId,
          roleId,
        })),
      );
    }
  }

  /**
   * 格式化用户响应
   */
  private formatUserResponse(user: any): UserResponse {
    const userRolesList = user.userRoles?.map((ur: any) => ur.role.name) || [];
    const userPermissions =
      user.userRoles?.flatMap((ur: any) => ur.role.rolePermissions.map((rp: any) => rp.permission.name)) || [];

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      avatar: user.avatar ?? undefined,
      isActive: user.isActive,
      isVerified: user.isVerified,
      roles: userRolesList,
      permissions: userPermissions,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

// 延迟初始化单例，避免循环依赖
let userServiceInstance: UserService | null = null;

export const getUserService = (): UserService => {
  if (!userServiceInstance) {
    const { userRepository } = require('@/modules/users/repositories/user.repository');
    userServiceInstance = new UserService(userRepository);
  }
  return userServiceInstance;
};

// 向后兼容的导出
export const userService = new Proxy({} as UserService, {
  get(_target, prop) {
    return getUserService()[prop as keyof UserService];
  },
});
