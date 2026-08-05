import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { bookings } from './bookings.js';
import { orderItems } from './orderItems.js';

export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'closed']);

export const supportTickets = pgTable('support_tickets', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name:      varchar('name', { length: 128 }).notNull(),
  email:     varchar('email', { length: 255 }).notNull(),
  subject:   varchar('subject', { length: 255 }).notNull(),
  message:   text('message').notNull(),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
  orderItemId: uuid('order_item_id').references(() => orderItems.id, { onDelete: 'set null' }),
  issueType: varchar('issue_type', { length: 64 }),
  priority: varchar('priority', { length: 16 }).notNull().default('normal'),
  status:    ticketStatusEnum('status').notNull().default('open'),
  response:  text('response'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SupportTicket    = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
