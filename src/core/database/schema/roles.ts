import { pgTable, varchar, boolean, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

/**
 * 角色表
 */
export const roles = pgTable(
  'roles',
  {
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    name: varchar('name', { length: 50 }).notNull().unique(),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    description: varchar('description', { length: 500 }),
    isActive: boolean('is_active').notNull().default(true),
    version: integer('version').notNull().default(1),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    deletedAtIdx: index('roles_deleted_at_idx').on(table.deletedAt),
  })
);

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
