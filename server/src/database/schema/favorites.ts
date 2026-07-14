import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { professionals } from './professionals.js';

export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    professionalId: uuid('professional_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('favorites_customer_professional_unique').on(t.customerId, t.professionalId)],
);

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
