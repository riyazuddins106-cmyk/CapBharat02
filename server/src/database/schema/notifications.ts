import { pgTable, uuid, varchar, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const notifications = pgTable('notifications', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title:     varchar('title', { length: 255 }).notNull(),
  body:      varchar('body', { length: 512 }).notNull(),
  type:      varchar('type', { length: 64 }).notNull().default('system'),
  isRead:    boolean('is_read').notNull().default(false),
  data:      jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Notification    = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
