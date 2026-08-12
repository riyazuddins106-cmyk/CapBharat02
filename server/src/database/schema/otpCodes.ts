import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const otpPurposeEnum = pgEnum('otp_purpose', ['signup', 'login', 'password_reset', 'change_email', 'change_phone']);

export const otpCodes = pgTable('otp_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  target: varchar('target', { length: 255 }),
  codeHash: varchar('code_hash', { length: 255 }).notNull(),
  purpose: otpPurposeEnum('purpose').notNull(),
  attempts: varchar('attempts', { length: 8 }).notNull().default('0'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OtpCode = typeof otpCodes.$inferSelect;
export type NewOtpCode = typeof otpCodes.$inferInsert;
