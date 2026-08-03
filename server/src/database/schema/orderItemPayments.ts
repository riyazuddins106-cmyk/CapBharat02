import { pgTable, uuid, varchar, timestamp, integer } from 'drizzle-orm/pg-core';
import { orderItems } from './orderItems.js';
import { orders } from './orders.js';
import { users } from './users.js';
import { paymentStatusEnum, paymentMethodEnum } from './payments.js';

export const orderItemPayments = pgTable('order_item_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderItemId: uuid('order_item_id').notNull().references(() => orderItems.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  currency: varchar('currency', { length: 8 }).notNull().default('INR'),
  status: paymentStatusEnum('status').notNull().default('created'),
  method: paymentMethodEnum('method'),
  razorpayOrderId: varchar('razorpay_order_id', { length: 128 }),
  razorpayPaymentId: varchar('razorpay_payment_id', { length: 128 }),
  razorpaySignature: varchar('razorpay_signature', { length: 256 }),
  stripeSessionId: varchar('stripe_session_id', { length: 256 }),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 256 }),
  notes: varchar('notes', { length: 512 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OrderItemPayment = typeof orderItemPayments.$inferSelect;
export type NewOrderItemPayment = typeof orderItemPayments.$inferInsert;
