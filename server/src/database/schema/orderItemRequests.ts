import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { orderItems } from './orderItems.js';
import { professionals } from './professionals.js';

export const orderItemRequests = pgTable('order_item_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderItemId: uuid('order_item_id').notNull().references(() => orderItems.id, { onDelete: 'cascade' }),
  partnerId: uuid('partner_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
  // pending | accepted | rejected | expired
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OrderItemRequest = typeof orderItemRequests.$inferSelect;
export type NewOrderItemRequest = typeof orderItemRequests.$inferInsert;
