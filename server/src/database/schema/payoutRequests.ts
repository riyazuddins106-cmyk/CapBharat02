import { pgTable, uuid, integer, timestamp, pgEnum, varchar } from 'drizzle-orm/pg-core';
import { professionals } from './professionals.js';

export const payoutStatusEnum = pgEnum('payout_status', ['pending', 'paid', 'rejected']);

export const payoutRequests = pgTable('payout_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  status: payoutStatusEnum('status').notNull().default('pending'),
  note: varchar('note', { length: 512 }),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

export type PayoutRequest = typeof payoutRequests.$inferSelect;
export type NewPayoutRequest = typeof payoutRequests.$inferInsert;
