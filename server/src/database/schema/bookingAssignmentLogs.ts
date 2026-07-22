import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { bookings } from './bookings.js';
import { professionals } from './professionals.js';
import { users } from './users.js';

export const bookingAssignmentLogs = pgTable('booking_assignment_logs', {
  id:               uuid('id').primaryKey().defaultRandom(),
  bookingId:        uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  partnerId:        uuid('partner_id').references(() => professionals.id, { onDelete: 'set null' }),
  // AUTO_SENT | PARTNER_ACCEPTED | PARTNER_REJECTED | MANUAL_ASSIGNED | REASSIGNED
  action:           varchar('action', { length: 64 }).notNull(),
  assignedByUserId: uuid('assigned_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type BookingAssignmentLog    = typeof bookingAssignmentLogs.$inferSelect;
export type NewBookingAssignmentLog = typeof bookingAssignmentLogs.$inferInsert;
