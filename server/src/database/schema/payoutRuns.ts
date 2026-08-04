import { pgTable, uuid, varchar, integer, timestamp, text } from 'drizzle-orm/pg-core';

export const payoutRuns = pgTable('payout_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  trigger: varchar('trigger', { length: 32 }).notNull(),
  scheduleKey: varchar('schedule_key', { length: 64 }),
  status: varchar('status', { length: 32 }).notNull().default('running'),
  requestedCount: integer('requested_count').notNull().default(0),
  successCount: integer('success_count').notNull().default(0),
  failureCount: integer('failure_count').notNull().default(0),
  requestedAmount: integer('requested_amount').notNull().default(0),
  paidAmount: integer('paid_amount').notNull().default(0),
  failureReason: text('failure_reason'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export type PayoutRun = typeof payoutRuns.$inferSelect;
export type NewPayoutRun = typeof payoutRuns.$inferInsert;