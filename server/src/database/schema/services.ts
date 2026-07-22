import { pgTable, uuid, varchar, integer, boolean, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { serviceCategories } from './serviceCategories.js';
import { subServiceCategories } from './subServiceCategories.js';

export const services = pgTable('services', {
  id:            uuid('id').primaryKey().defaultRandom(),
  categoryId:    uuid('category_id').notNull().references(() => serviceCategories.id, { onDelete: 'restrict' }),
  subCategoryId: uuid('sub_category_id').references(() => subServiceCategories.id, { onDelete: 'set null' }),
  name:          varchar('name', { length: 255 }).notNull(),
  description:   text('description'),
  images:        jsonb('images').notNull().default([]),
  customerPrice: integer('customer_price').notNull().default(0),
  partnerPayout: integer('partner_payout').notNull().default(0),
  commission:    integer('commission').notNull().default(0),
  duration:      integer('duration').notNull().default(60), // minutes
  requiredSkill: varchar('required_skill', { length: 255 }),
  badge:        varchar('badge', { length: 64 }),
  featured:     boolean('featured').notNull().default(false),
  isActive:      boolean('is_active').notNull().default(true),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt:     timestamp('deleted_at', { withTimezone: true }),
});

export type Service    = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
