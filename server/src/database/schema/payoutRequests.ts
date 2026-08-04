import { pgTable, uuid, integer, timestamp, pgEnum, varchar, text } from 'drizzle-orm/pg-core';
import { professionals } from './professionals.js';

export const payoutStatusEnum = pgEnum('payout_status', ['pending', 'approved', 'processing', 'paid', 'rejected']);

export const payoutRequests = pgTable('payout_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  status: payoutStatusEnum('status').notNull().default('pending'),
  note: varchar('note', { length: 512 }),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  providerPayoutId: varchar('provider_payout_id', { length: 128 }),
  providerStatus: varchar('provider_status', { length: 64 }),
  failureReason: text('failure_reason'),
  processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
});

export type PayoutRequest = typeof payoutRequests.$inferSelect;
export type NewPayoutRequest = typeof payoutRequests.$inferInsert;
