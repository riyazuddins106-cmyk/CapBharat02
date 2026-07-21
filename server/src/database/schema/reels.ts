import { pgTable, uuid, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { serviceCategories } from './serviceCategories.js';

export const reels = pgTable('reels', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  title:              varchar('title',                { length: 255 }).notNull(),
  description:        varchar('description',          { length: 512 }),
  videoUrl:           varchar('video_url',            { length: 512 }).notNull(),
  platform:           varchar('platform',             { length: 32  }).notNull().default('unknown'),
  thumbnailUrl:       varchar('thumbnail_url',        { length: 512 }),   // auto-generated (YouTube)
  customThumbnailUrl: varchar('custom_thumbnail_url', { length: 512 }),   // admin-uploaded
  category:           varchar('category',             { length: 128 }),
  serviceCategoryId:  uuid('service_category_id').references(() => serviceCategories.id, { onDelete: 'set null' }),
  sortOrder:          integer('sort_order').notNull().default(0),
  isActive:           boolean('is_active').notNull().default(true),
  featured:           boolean('featured').notNull().default(false),
  publishDate:        timestamp('publish_date', { withTimezone: true }),
  expiryDate:         timestamp('expiry_date',  { withTimezone: true }),
  clickCount:         integer('click_count').notNull().default(0),
  viewCount:          integer('view_count').notNull().default(0),
  createdAt:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:          timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt:          timestamp('deleted_at', { withTimezone: true }),
});

export type Reel    = typeof reels.$inferSelect;
export type NewReel = typeof reels.$inferInsert;
