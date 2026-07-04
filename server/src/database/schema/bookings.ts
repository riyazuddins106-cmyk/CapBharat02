import { pgTable, uuid, varchar, timestamp, integer, text, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { professionals } from './professionals';
import { serviceCategories } from './serviceCategories';
import { addresses } from './addresses';

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'upcoming',
  'in_progress',
  'completed',
  'cancelled',
]);

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id, { onDelete: 'restrict' }),
  categoryId: uuid('category_id').notNull().references(() => serviceCategories.id, { onDelete: 'restrict' }),
  addressId: uuid('address_id').references(() => addresses.id, { onDelete: 'set null' }),
  serviceName: varchar('service_name', { length: 255 }).notNull(),
  proName: varchar('pro_name', { length: 255 }).notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  status: bookingStatusEnum('status').notNull().default('upcoming'),
  notes: text('notes'),
  price: integer('price').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
