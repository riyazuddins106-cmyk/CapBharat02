import { pgTable, uuid, varchar, timestamp, boolean, doublePrecision } from 'drizzle-orm/pg-core';
import { users } from './users';

export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 64 }).notNull().default('Home'),
  line1: varchar('line1', { length: 255 }).notNull(),
  line2: varchar('line2', { length: 255 }),
  city: varchar('city', { length: 128 }).notNull(),
  state: varchar('state', { length: 128 }).notNull(),
  postalCode: varchar('postal_code', { length: 32 }).notNull(),
  country: varchar('country', { length: 128 }).notNull().default('India'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
