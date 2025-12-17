/**
 * 用户 Repository
 * 处理用户数据访问
 */
import { createId } from '@paralleldrive/cuid2';
import { eq, or, and, isNull } from 'drizzle-orm';

import { db, users } from '@/core/database';
import type { User, NewUser } from '@/core/database/schema/users';
import { BaseRepository } from '@/shared/repositories/base.repository';

export class UserRepository extends BaseRepository<typeof users> {
  constructor() {
    super(users);
  }

  protected getTableName(): string {
    return 'users';
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: and(eq(users.email, email), isNull(users.deletedAt)),
    });
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: and(eq(users.username, username), isNull(users.deletedAt)),
    });
  }

  /**
   * 根据邮箱或用户名查找用户
   */
  async findByEmailOrUsername(email: string, username: string): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: and(or(eq(users.email, email), eq(users.username, username)), isNull(users.deletedAt)),
    });
  }

  /**
   * 创建用户
   */
  async createUser(data: NewUser): Promise<User> {
    const userId = data.id || createId();
    await db.insert(users).values({ ...data, id: userId });
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(userId: string): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  }

  /**
   * 查找用户及其角色权限
   */
  async findWithRolesAndPermissions(userId: string) {
    return db.query.users.findFirst({
      where: and(eq(users.id, userId), isNull(users.deletedAt)),
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
  }

  /**
   * 根据邮箱查找用户及其角色权限（用于登录）
   */
  async findByEmailWithRolesAndPermissions(email: string) {
    return db.query.users.findFirst({
      where: and(eq(users.email, email), isNull(users.deletedAt)),
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
  }

  /**
   * 更新用户密码
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  /**
   * 激活用户
   */
  async activate(userId: string): Promise<void> {
    await db.update(users).set({ isActive: true, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  /**
   * 停用用户
   */
  async deactivate(userId: string): Promise<void> {
    await db.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  /**
   * 验证用户邮箱
   */
  async verifyEmail(userId: string): Promise<void> {
    await db.update(users).set({ isVerified: true, updatedAt: new Date() }).where(eq(users.id, userId));
  }
}

export const userRepository = new UserRepository();
