import { pgTable, uuid, integer, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { bookings } from './bookings.js';

export const pointsEntryTypeEnum = pgEnum('points_entry_type', ['earn', 'redeem', 'adjust']);

export const pointsLedger = pgTable('points_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
  type: pointsEntryTypeEnum('type').notNull(),
  points: integer('points').notNull(), // positive for earn/adjust-up, negative for redeem
  description: varchar('description', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PointsLedgerEntry = typeof pointsLedger.$inferSelect;
export type NewPointsLedgerEntry = typeof pointsLedger.$inferInsert;
