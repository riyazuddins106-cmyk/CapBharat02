import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Generic key-value store for admin-managed platform settings.
 * Each row is a JSON blob keyed by a short slug
 * e.g. "payment_config", "email_config".
 */
export const platformSettings = pgTable('platform_settings', {
  id:        uuid('id').primaryKey().defaultRandom(),
  key:       varchar('key', { length: 64 }).notNull().unique(),
  value:     text('value').notNull().default('{}'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PlatformSetting    = typeof platformSettings.$inferSelect;
export type NewPlatformSetting = typeof platformSettings.$inferInsert;
