import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { serviceCategories } from './serviceCategories.js';

export const subServiceCategories = pgTable('sub_service_categories', {
  id:          uuid('id').primaryKey().defaultRandom(),
  categoryId:  uuid('category_id').notNull().references(() => serviceCategories.id, { onDelete: 'cascade' }),
  name:        varchar('name',        { length: 128 }).notNull(),
  description: varchar('description', { length: 512 }),
  imageUrl:    varchar('image_url',   { length: 512 }),
  sortOrder:   integer('sort_order').notNull().default(0),
  featured:    boolean('featured').notNull().default(false),
  isActive:    boolean('is_active').notNull().default(true),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SubServiceCategory    = typeof subServiceCategories.$inferSelect;
export type NewSubServiceCategory = typeof subServiceCategories.$inferInsert;
