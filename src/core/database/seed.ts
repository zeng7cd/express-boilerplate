/**
 * 数据库种子数据
 */
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

import { users, roles, permissions, userRoles, rolePermissions } from './schema';

// 加载环境变量
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const connectionString = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/express_db';
const connection = await mysql.createConnection(connectionString);
const db = drizzle(connection, { schema: { users, roles, permissions, userRoles, rolePermissions }, mode: 'default' });

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // 创建角色
    console.log('Creating roles...');
    const roleData = [
      {
        name: 'admin',
        displayName: '管理员',
        description: '系统管理员，拥有所有权限',
      },
      {
        name: 'user',
        displayName: '普通用户',
        description: '普通用户，拥有基本权限',
      },
      {
        name: 'moderator',
        displayName: '版主',
        description: '版主，拥有内容管理权限',
      },
    ];

    await db.insert(roles).values(roleData);

    // 查询插入的角色
    const [adminRole, userRole, moderatorRole] = await Promise.all([
      db.query.roles.findFirst({ where: (roles, { eq }) => eq(roles.name, 'admin') }),
      db.query.roles.findFirst({ where: (roles, { eq }) => eq(roles.name, 'user') }),
      db.query.roles.findFirst({ where: (roles, { eq }) => eq(roles.name, 'moderator') }),
    ]);

    if (!adminRole || !userRole || !moderatorRole) {
      throw new Error('Failed to create roles');
    }

    console.log('✅ Roles created');

    // 创建权限
    console.log('Creating permissions...');
    const permissionsData = [
      // 用户权限
      { name: 'users:read', resource: 'users', action: 'read', description: '查看用户' },
      { name: 'users:write', resource: 'users', action: 'write', description: '创建/更新用户' },
      { name: 'users:delete', resource: 'users', action: 'delete', description: '删除用户' },
      // 角色权限
      { name: 'roles:read', resource: 'roles', action: 'read', description: '查看角色' },
      { name: 'roles:write', resource: 'roles', action: 'write', description: '创建/更新角色' },
      { name: 'roles:delete', resource: 'roles', action: 'delete', description: '删除角色' },
      // 权限管理
      { name: 'permissions:read', resource: 'permissions', action: 'read', description: '查看权限' },
      { name: 'permissions:write', resource: 'permissions', action: 'write', description: '创建/更新权限' },
      // 内容权限
      { name: 'posts:read', resource: 'posts', action: 'read', description: '查看文章' },
      { name: 'posts:write', resource: 'posts', action: 'write', description: '创建/更新文章' },
      { name: 'posts:delete', resource: 'posts', action: 'delete', description: '删除文章' },
    ];

    await db.insert(permissions).values(permissionsData);

    // 查询所有权限
    const permissionsList = await db.query.permissions.findMany();

    console.log('✅ Permissions created');

    // 分配权限给角色
    console.log('Assigning permissions to roles...');

    // 管理员拥有所有权限
    await db.insert(rolePermissions).values(
      permissionsList.map((permission) => ({
        roleId: adminRole.id,
        permissionId: permission.id,
      })),
    );

    // 普通用户权限
    const userPermissions = permissionsList.filter((p) => ['users:read', 'posts:read', 'posts:write'].includes(p.name));
    await db.insert(rolePermissions).values(
      userPermissions.map((permission) => ({
        roleId: userRole.id,
        permissionId: permission.id,
      })),
    );

    // 版主权限
    const moderatorPermissions = permissionsList.filter((p) =>
      ['users:read', 'posts:read', 'posts:write', 'posts:delete'].includes(p.name),
    );
    await db.insert(rolePermissions).values(
      moderatorPermissions.map((permission) => ({
        roleId: moderatorRole.id,
        permissionId: permission.id,
      })),
    );

    console.log('✅ Permissions assigned to roles');

    // 创建测试用户
    console.log('Creating test users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const usersData = [
      {
        email: 'admin@example.com',
        username: 'admin',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        isVerified: true,
      },
      {
        email: 'user@example.com',
        username: 'user',
        password: hashedPassword,
        firstName: 'Normal',
        lastName: 'User',
        isActive: true,
        isVerified: true,
      },
    ];

    await db.insert(users).values(usersData);

    // 查询插入的用户
    const [adminUser, normalUser] = await Promise.all([
      db.query.users.findFirst({ where: (users, { eq }) => eq(users.username, 'admin') }),
      db.query.users.findFirst({ where: (users, { eq }) => eq(users.username, 'user') }),
    ]);

    if (!adminUser || !normalUser) {
      throw new Error('Failed to create users');
    }

    console.log('✅ Test users created');

    // 分配角色给用户
    console.log('Assigning roles to users...');
    await db.insert(userRoles).values([
      { userId: adminUser.id, roleId: adminRole.id },
      { userId: normalUser.id, roleId: userRole.id },
    ]);

    console.log('✅ Roles assigned to users');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Test accounts:');
    console.log('  Admin: admin@example.com / password123');
    console.log('  User:  user@example.com / password123');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await connection.end();
  }

  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
