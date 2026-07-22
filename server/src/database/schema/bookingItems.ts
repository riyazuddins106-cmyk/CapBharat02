import { pgTable, uuid, integer, timestamp } from 'drizzle-orm/pg-core';
import { bookings } from './bookings.js';
import { services } from './services.js';

export const bookingItems = pgTable('booking_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull().default(1),
  unitCustomerPrice: integer('unit_customer_price').notNull(),
  unitPartnerPayout: integer('unit_partner_payout').notNull(),
  lineTotal: integer('line_total').notNull(),
  duration: integer('duration').notNull().default(60),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type BookingItem = typeof bookingItems.$inferSelect;