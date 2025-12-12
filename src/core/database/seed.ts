/**
 * 数据库种子数据
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, roles, permissions, userRoles, rolePermissions } from './schema';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

// 加载环境变量
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:T7m!pL9@qW2s@192.168.146.5:5432/postgres';
const queryClient = postgres(connectionString);
const db = drizzle(queryClient, { schema: { users, roles, permissions, userRoles, rolePermissions } });

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // 创建角色
    console.log('Creating roles...');
    const [adminRole, userRole, moderatorRole] = await db
      .insert(roles)
      .values([
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
      ])
      .returning();

    console.log('✅ Roles created');

    // 创建权限
    console.log('Creating permissions...');
    const permissionsList = await db
      .insert(permissions)
      .values([
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
      ])
      .returning();

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

    const [adminUser, normalUser] = await db
      .insert(users)
      .values([
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
      ])
      .returning();

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
    await queryClient.end();
  }

  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
