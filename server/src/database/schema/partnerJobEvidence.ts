import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { professionals } from './professionals.js';
import { bookings } from './bookings.js';
import { orderItems } from './orderItems.js';

export const partnerEvidencePhaseEnum = ['before', 'after'] as const;

export const partnerJobEvidence = pgTable('partner_job_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }),
  orderItemId: uuid('order_item_id').references(() => orderItems.id, { onDelete: 'cascade' }),
  phase: varchar('phase', { length: 16 }).notNull(),
  fileUrl: varchar('file_url', { length: 2048 }).notNull(),
  fileName: varchar('file_name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PartnerJobEvidence = typeof partnerJobEvidence.$inferSelect;
export type NewPartnerJobEvidence = typeof partnerJobEvidence.$inferInsert;