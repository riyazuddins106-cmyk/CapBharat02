import { pgTable, uuid, varchar, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const offers = pgTable('offers', {
  id:           uuid('id').primaryKey().defaultRandom(),
  title:        varchar('title',         { length: 255 }).notNull(),
  subtitle:     varchar('subtitle',      { length: 255 }).notNull().default(''),
  tag:          varchar('tag',           { length: 64  }).notNull().default('LIMITED OFFER'),
  discountText: varchar('discount_text', { length: 64  }).notNull().default(''),
  bgColor:      varchar('bg_color',      { length: 16  }).notNull().default('#5B3EF5'),
  ctaText:      varchar('cta_text',      { length: 64  }).notNull().default('Book Now'),
  ctaRoute:     varchar('cta_route',     { length: 128 }).notNull().default('/(tabs)/services'),
  isActive:     boolean('is_active').notNull().default(true),
  sortOrder:    integer('sort_order').notNull().default(0),
  expiresAt:    timestamp('expires_at', { withTimezone: true }),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('idx_offers_active').on(t.isActive)]);
