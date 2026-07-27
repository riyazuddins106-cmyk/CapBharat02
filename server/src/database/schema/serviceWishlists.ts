import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { services } from './services.js';

export const serviceWishlists = pgTable(
  'service_wishlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('service_wishlists_customer_service_unique').on(t.customerId, t.serviceId)],
);

export type ServiceWishlist = typeof serviceWishlists.$inferSelect;
export type NewServiceWishlist = typeof serviceWishlists.$inferInsert;
