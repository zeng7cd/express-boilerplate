import { pgTable, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

/**
 * 权限表
 */
export const permissions = pgTable(
  'permissions',
  {
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    name: varchar('name', { length: 100 }).notNull().unique(),
    resource: varchar('resource', { length: 50 }).notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    description: varchar('description', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    resourceActionIdx: uniqueIndex('permissions_resource_action_idx').on(table.resource, table.action),
  })
);

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
