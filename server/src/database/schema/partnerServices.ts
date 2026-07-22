import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core';
import { professionals } from './professionals.js';
import { services } from './services.js';

export const partnerServices = pgTable('partner_services', {
  id:        uuid('id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: unique().on(t.partnerId, t.serviceId),
}));

export type PartnerService    = typeof partnerServices.$inferSelect;
export type NewPartnerService = typeof partnerServices.$inferInsert;
