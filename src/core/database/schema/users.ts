import { createId } from '@paralleldrive/cuid2';
import { mysqlTable, varchar, boolean, timestamp, int, index } from 'drizzle-orm/mysql-core';

/**
 * 用户表
 */
export const users = mysqlTable(
  'users',
  {
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    email: varchar('email', { length: 255 }).notNull().unique(),
    username: varchar('username', { length: 100 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    avatar: varchar('avatar', { length: 500 }),
    isActive: boolean('is_active').notNull().default(true),
    isVerified: boolean('is_verified').notNull().default(false),
    lastLoginAt: timestamp('last_login_at'),
    version: int('version').notNull().default(1),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    usernameIdx: index('users_username_idx').on(table.username),
    isActiveIdx: index('users_is_active_idx').on(table.isActive),
    deletedAtIdx: index('users_deleted_at_idx').on(table.deletedAt),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
