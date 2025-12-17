/**
 * 角色 Repository
 * 处理角色数据访问
 */
import { createId } from '@paralleldrive/cuid2';
import { eq, and, isNull, ilike, or } from 'drizzle-orm';

import { db, roles, rolePermissions, permissions } from '@/core/database';
import type { Role, NewRole } from '@/core/database/schema/roles';
import { BaseRepository } from '@/shared/repositories/base.repository';

export class RoleRepository extends BaseRepository<typeof roles> {
  constructor() {
    super(roles);
  }

  protected getTableName(): string {
    return 'roles';
  }

  /**
   * 根据名称查找角色
   */
  async findByName(name: string): Promise<Role | undefined> {
    return db.query.roles.findFirst({
      where: and(eq(roles.name, name), isNull(roles.deletedAt)),
    });
  }

  /**
   * 创建角色
   */
  async createRole(data: NewRole): Promise<Role> {
    const roleId = data.id || createId();
    await db.insert(roles).values({ ...data, id: roleId });
    const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
    return role;
  }

  /**
   * 查找角色及其权限
   */
  async findWithPermissions(roleId: string) {
    return db.query.roles.findFirst({
      where: and(eq(roles.id, roleId), isNull(roles.deletedAt)),
      with: {
        rolePermissions: {
          with: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * 查找所有角色及其权限
   */
  async findAllWithPermissions(options?: { includeInactive?: boolean }) {
    const conditions = [isNull(roles.deletedAt)];

    if (!options?.includeInactive) {
      conditions.push(eq(roles.isActive, true));
    }

    return db.query.roles.findMany({
      where: and(...conditions),
      with: {
        rolePermissions: {
          with: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * 搜索角色
   */
  async search(query: string) {
    return db.query.roles.findMany({
      where: and(or(ilike(roles.name, `%${query}%`), ilike(roles.displayName, `%${query}%`)), isNull(roles.deletedAt)),
    });
  }

  /**
   * 分配权限给角色
   */
  async assignPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    // 删除现有权限
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    // 分配新权限
    if (permissionIds.length > 0) {
      await db.insert(rolePermissions).values(
        permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      );
    }
  }

  /**
   * 获取角色的权限列表
   */
  async getPermissions(roleId: string) {
    const result = await db
      .select({
        permission: permissions,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));

    return result.map((r) => r.permission);
  }

  /**
   * 激活角色
   */
  async activate(roleId: string): Promise<void> {
    await db.update(roles).set({ isActive: true, updatedAt: new Date() }).where(eq(roles.id, roleId));
  }

  /**
   * 停用角色
   */
  async deactivate(roleId: string): Promise<void> {
    await db.update(roles).set({ isActive: false, updatedAt: new Date() }).where(eq(roles.id, roleId));
  }
}

export const roleRepository = new RoleRepository();
