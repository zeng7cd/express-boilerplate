/**
 * 用户服务
 */
import * as bcrypt from 'bcryptjs';
import { prisma } from '../../../core/database';
import type { Prisma } from '../../../generated/prisma/client';
import { env } from '../../../core/config/env';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserResponse,
  UserListQuery,
  UserListResponse,
  ChangePasswordRequest,
} from '../../../shared/types/user';

export class UserService {
  /**
   * 创建用户
   */
  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 分配角色
    if (data.roleIds && data.roleIds.length > 0) {
      await this.assignRoles(user.id, data.roleIds);
    } else {
      // 分配默认角色
      const defaultRole = await prisma.role.findUnique({
        where: { name: 'user' },
      });

      if (defaultRole) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: defaultRole.id,
          },
        });
      }
    }

    return this.formatUserResponse(user);
  }

  /**
   * 获取用户列表
   */
  async getUsers(query: UserListQuery): Promise<UserListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { username: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.role) {
      where.userRoles = {
        some: {
          role: {
            name: query.role,
          },
        },
      };
    }

    // 获取用户列表和总数
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) =>
        this.formatUserResponse(
          user as Prisma.UserGetPayload<{
            include: {
              userRoles: {
                include: {
                  role: {
                    include: {
                      rolePermissions: {
                        include: {
                          permission: true;
                        };
                      };
                    };
                  };
                };
              };
            };
          }>,
        ),
      ),
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
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
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
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }

    // 更新用户基本信息
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        avatar: data.avatar,
        isActive: data.isActive,
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 更新角色
    if (data.roleIds) {
      await this.assignRoles(id, data.roleIds);
    }

    return this.formatUserResponse(updatedUser);
  }

  /**
   * 删除用户
   */
  async deleteUser(id: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }

    await prisma.user.delete({ where: { id } });
  }

  /**
   * 修改密码
   */
  async changePassword(id: string, data: ChangePasswordRequest): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id } });
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
    await prisma.user.update({
      where: { id },
      data: { password: hashedNewPassword },
    });
  }

  /**
   * 分配角色
   */
  private async assignRoles(userId: string, roleIds: string[]): Promise<void> {
    // 删除现有角色
    await prisma.userRole.deleteMany({
      where: { userId },
    });

    // 分配新角色
    if (roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({
          userId,
          roleId,
        })),
      });
    }
  }

  /**
   * 格式化用户响应
   */
  private formatUserResponse(
    user: Prisma.UserGetPayload<{
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true;
                  };
                };
              };
            };
          };
        };
      };
    }>,
  ): UserResponse {
    const roles = user.userRoles?.map((ur) => ur.role.name) || [];
    const permissions = user.userRoles?.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.name)) || [];

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      avatar: user.avatar ?? undefined,
      isActive: user.isActive,
      isVerified: user.isVerified,
      roles,
      permissions,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

// 导出单例实例
export const userService = new UserService();
