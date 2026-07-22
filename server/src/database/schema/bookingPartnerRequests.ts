import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { bookings } from './bookings.js';
import { professionals } from './professionals.js';

export const bookingPartnerRequests = pgTable('booking_partner_requests', {
  id:          uuid('id').primaryKey().defaultRandom(),
  bookingId:   uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  partnerId:   uuid('partner_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
  // pending | accepted | rejected | expired
  status:      varchar('status', { length: 32 }).notNull().default('pending'),
  sentAt:      timestamp('sent_at',      { withTimezone: true }).notNull().defaultNow(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
});

export type BookingPartnerRequest    = typeof bookingPartnerRequests.$inferSelect;
export type NewBookingPartnerRequest = typeof bookingPartnerRequests.$inferInsert;
