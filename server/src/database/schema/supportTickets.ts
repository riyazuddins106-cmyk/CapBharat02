import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'closed']);

export const supportTickets = pgTable('support_tickets', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name:      varchar('name', { length: 128 }).notNull(),
  email:     varchar('email', { length: 255 }).notNull(),
  subject:   varchar('subject', { length: 255 }).notNull(),
  message:   text('message').notNull(),
  status:    ticketStatusEnum('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SupportTicket    = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
