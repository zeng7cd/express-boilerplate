import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';
import { mysqlTable, varchar, timestamp, index, uniqueIndex, json } from 'drizzle-orm/mysql-core';

import { permissions } from './permissions';
import { roles } from './roles';
import { users } from './users';

/**
 * 用户角色关联表
 */
export const userRoles = mysqlTable(
  'user_roles',
  {
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: varchar('user_id', { length: 128 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: varchar('role_id', { length: 128 })
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    userRoleIdx: uniqueIndex('user_roles_user_role_idx').on(table.userId, table.roleId),
  }),
);

/**
 * 角色权限关联表
 */
export const rolePermissions = mysqlTable(
  'role_permissions',
  {
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    roleId: varchar('role_id', { length: 128 })
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: varchar('permission_id', { length: 128 })
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    rolePermissionIdx: uniqueIndex('role_permissions_role_permission_idx').on(table.roleId, table.permissionId),
  }),
);

/**
 * 用户会话表
 */
export const sessions = mysqlTable(
  'sessions',
  {
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: varchar('user_id', { length: 128 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 500 }).notNull().unique(),
    refreshToken: varchar('refresh_token', { length: 500 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    tokenIdx: index('sessions_token_idx').on(table.token),
    refreshTokenIdx: index('sessions_refresh_token_idx').on(table.refreshToken),
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
    userExpiresIdx: index('sessions_user_expires_idx').on(table.userId, table.expiresAt),
  }),
);

/**
 * 审计日志表
 */
export const auditLogs = mysqlTable(
  'audit_logs',
  {
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: varchar('user_id', { length: 128 }).references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    resource: varchar('resource', { length: 100 }).notNull(),
    resourceId: varchar('resource_id', { length: 128 }),
    details: json('details'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
    actionIdx: index('audit_logs_action_idx').on(table.action),
    resourceIdx: index('audit_logs_resource_idx').on(table.resource),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
    userCreatedIdx: index('audit_logs_user_created_idx').on(table.userId, table.createdAt),
    resourceActionCreatedIdx: index('audit_logs_resource_action_created_idx').on(
      table.resource,
      table.action,
      table.createdAt,
    ),
  }),
);

// 定义关系
export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
