import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const platformPolicies = pgTable('platform_policies', {
  id:        uuid('id').primaryKey().defaultRandom(),
  slug:      varchar('slug', { length: 64 }).notNull().unique(),
  title:     varchar('title', { length: 255 }).notNull(),
  content:   text('content').notNull().default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type PlatformPolicy    = typeof platformPolicies.$inferSelect;
export type NewPlatformPolicy = typeof platformPolicies.$inferInsert;
