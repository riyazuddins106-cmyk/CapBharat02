import { pgTable, uuid, varchar, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { bookings } from './bookings';
import { users } from './users';

export const paymentStatusEnum = pgEnum('payment_status', [
  'created',
  'paid',
  'failed',
  'refunded',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'card',
  'netbanking',
  'upi',
  'wallet',
  'other',
]);

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  currency: varchar('currency', { length: 8 }).notNull().default('INR'),
  status: paymentStatusEnum('status').notNull().default('created'),
  method: paymentMethodEnum('method'),
  razorpayOrderId: varchar('razorpay_order_id', { length: 128 }).notNull(),
  razorpayPaymentId: varchar('razorpay_payment_id', { length: 128 }),
  razorpaySignature: varchar('razorpay_signature', { length: 256 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
