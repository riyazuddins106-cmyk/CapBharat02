/**
 * Migration: Add razorpay/stripe enum values and stripe columns to payments table.
 * Run once: pnpm --filter @servenow/server exec tsx src/scripts/add-payment-gateway-columns.ts
 */
import 'dotenv/config';
import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

async function run() {
  logger.info('Adding razorpay/stripe to payment_method enum and stripe columns...');

  // PostgreSQL allows adding values to an existing enum (but not inside a transaction < PG 12)
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'razorpay'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')
      ) THEN
        ALTER TYPE payment_method ADD VALUE 'razorpay';
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'stripe'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')
      ) THEN
        ALTER TYPE payment_method ADD VALUE 'stripe';
      END IF;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS stripe_session_id        VARCHAR(256),
      ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(256);
  `);

  logger.info('Migration complete.');
  process.exit(0);
}

run().catch(err => { logger.error(err); process.exit(1); });
