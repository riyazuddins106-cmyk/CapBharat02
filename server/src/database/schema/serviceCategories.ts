import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const serviceCategories = pgTable('service_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 128 }).notNull().unique(),
  description: varchar('description', { length: 512 }),
  iconName: varchar('icon_name', { length: 64 }).notNull().default('Grid'),
  color: varchar('color', { length: 16 }).notNull().default('#F3F4F6'),
  iconColor: varchar('icon_color', { length: 16 }).notNull().default('#6B7280'),
  serviceCount: integer('service_count').notNull().default(0),
  imageUrl:  varchar('image_url', { length: 512 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type NewServiceCategory = typeof serviceCategories.$inferInsert;
