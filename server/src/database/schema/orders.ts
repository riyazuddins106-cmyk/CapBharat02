import { pgTable, uuid, varchar, timestamp, integer, text, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { addresses } from './addresses.js';

export const orderStatusEnum = pgEnum('order_status', [
  'created',
  'searching_partners',
  'partially_confirmed',
  'fully_confirmed',
  'in_progress',
  'partially_completed',
  'completed',
  'cancelled',
]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  addressId: uuid('address_id').references(() => addresses.id, { onDelete: 'set null' }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  status: orderStatusEnum('status').notNull().default('created'),
  totalAmount: integer('total_amount').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
