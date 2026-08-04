import { pgTable, uuid, timestamp, integer, text, pgEnum } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';
import { services } from './services.js';
import { professionals } from './professionals.js';

export const orderItemStatusEnum = pgEnum('order_item_status', [
  'searching_partner',
  'assigned',
  'partner_accepted',
  'partner_arrived',
  'payment_pending',
  'payment_completed',
  'service_started',
  'service_completed',
  'cancelled',
]);

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'restrict' }),
  partnerId: uuid('partner_id').references(() => professionals.id, { onDelete: 'set null' }),
  status: orderItemStatusEnum('status').notNull().default('searching_partner'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(60),
  customerPrice: integer('customer_price').notNull(),
  partnerPayout: integer('partner_payout').notNull(),
  quantity: integer('quantity').notNull().default(1),
  cancellationReason: text('cancellation_reason'),
  cancellationFee: integer('cancellation_fee').notNull().default(0),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
