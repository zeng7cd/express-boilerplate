import { createId } from '@paralleldrive/cuid2';
import { mysqlTable, varchar, boolean, timestamp, int, index } from 'drizzle-orm/mysql-core';

/**
 * 角色表
 */
export const roles = mysqlTable(
  'roles',
  {
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    name: varchar('name', { length: 50 }).notNull().unique(),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    description: varchar('description', { length: 500 }),
    isActive: boolean('is_active').notNull().default(true),
    version: int('version').notNull().default(1),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    deletedAtIdx: index('roles_deleted_at_idx').on(table.deletedAt),
  }),
);

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
