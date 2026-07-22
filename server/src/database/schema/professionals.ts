import { pgTable, uuid, varchar, integer, doublePrecision, boolean, timestamp, text, json } from 'drizzle-orm/pg-core';
import { serviceCategories } from './serviceCategories.js';
import { subServiceCategories } from './subServiceCategories.js';
import { users } from './users.js';

export const professionals = pgTable('professionals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').unique().references(() => users.id, { onDelete: 'set null' }),
  categoryId: uuid('category_id').notNull().references(() => serviceCategories.id, { onDelete: 'restrict' }),
  subCategoryId: uuid('sub_category_id').references(() => subServiceCategories.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  bio: text('bio'),
  rating: doublePrecision('rating').notNull().default(0),
  reviewCount: integer('review_count').notNull().default(0),
  basePrice: integer('base_price').notNull().default(0),
  priceUnit: varchar('price_unit', { length: 32 }).notNull().default('/visit'),
  badge: varchar('badge', { length: 64 }),
  avatarUrl: varchar('avatar_url', { length: 512 }),
  tags: json('tags').$type<string[]>().notNull().default([]),
  availabilityStatus: varchar('availability_status', { length: 16 }).notNull().default('offline'),
  currentBookingStatus: varchar('current_booking_status', { length: 16 }).notNull().default('available'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  completedJobs: integer('completed_jobs').notNull().default(0),
  acceptanceRate: doublePrecision('acceptance_rate').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Professional = typeof professionals.$inferSelect;
export type NewProfessional = typeof professionals.$inferInsert;
