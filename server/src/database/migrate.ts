/**
 * Run with: ./node_modules/.bin/tsx src/database/migrate.ts
 * Creates all tables. Safe to run multiple times (IF NOT EXISTS).
 */
import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.SUPABASE_DATABASE_URL;
if (!url) throw new Error('SUPABASE_DATABASE_URL is not set');

const sql = postgres(url, { ssl: 'require', max: 1 });

async function run(label: string, query: string) {
  try {
    await sql.unsafe(query);
    console.log(`  ✓ ${label}`);
  } catch (e: any) {
    const skipCodes = ['42710', '42P07', '42701', '23505', '42883'];
    if (skipCodes.includes(e?.code)) {
      console.log(`  – ${label} (already exists / skipped)`);
    } else if (e?.severity === 'NOTICE') {
      console.log(`  – ${label} (notice: ${e.message})`);
    } else {
      console.warn(`  ⚠ ${label}: ${e?.message ?? e}`);
    }
  }
}

async function migrate() {
  console.log('[migrate] Connecting…');

  await run('enum: user_role',
    `CREATE TYPE user_role AS ENUM ('customer', 'partner', 'admin')`);

  await run('enum: booking_status',
    `CREATE TYPE booking_status AS ENUM ('pending', 'upcoming', 'in_progress', 'completed', 'cancelled')`);

  await run('table: users', `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(32),
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      avatar_url VARCHAR(512),
      role user_role NOT NULL DEFAULT 'customer',
      email_verified_at TIMESTAMPTZ,
      phone_verified_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )`);

  await run('table: refresh_tokens', `
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  await run('table: otp_codes', `
    CREATE TABLE IF NOT EXISTS otp_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      purpose VARCHAR(32) NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  await run('table: addresses', `
    CREATE TABLE IF NOT EXISTS addresses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label VARCHAR(64) NOT NULL DEFAULT 'Home',
      line1 VARCHAR(255) NOT NULL,
      line2 VARCHAR(255),
      city VARCHAR(128) NOT NULL,
      state VARCHAR(128) NOT NULL,
      postal_code VARCHAR(32) NOT NULL,
      country VARCHAR(128) NOT NULL DEFAULT 'India',
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )`);

  await run('table: service_categories', `
    CREATE TABLE IF NOT EXISTS service_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(128) NOT NULL UNIQUE,
      description VARCHAR(512),
      icon_name VARCHAR(64) NOT NULL DEFAULT 'Grid',
      color VARCHAR(16) NOT NULL DEFAULT '#F3F4F6',
      icon_color VARCHAR(16) NOT NULL DEFAULT '#6B7280',
      service_count INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  await run('table: professionals', `
    CREATE TABLE IF NOT EXISTS professionals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
      name VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      bio TEXT,
      rating DOUBLE PRECISION NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      base_price INTEGER NOT NULL DEFAULT 0,
      price_unit VARCHAR(32) NOT NULL DEFAULT '/visit',
      badge VARCHAR(64),
      avatar_url VARCHAR(512),
      tags JSONB NOT NULL DEFAULT '[]',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )`);

  await run('table: bookings', `
    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
      category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
      address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
      service_name VARCHAR(255) NOT NULL,
      pro_name VARCHAR(255) NOT NULL,
      scheduled_at TIMESTAMPTZ NOT NULL,
      status booking_status NOT NULL DEFAULT 'upcoming',
      notes TEXT,
      price INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )`);

  await run('table: reviews', `
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
      customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  await run('table: favorites', `
    CREATE TABLE IF NOT EXISTS favorites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(customer_id, professional_id)
    )`);

  await run('index: professionals_category',  `CREATE INDEX IF NOT EXISTS idx_professionals_category ON professionals(category_id)`);
  await run('index: bookings_customer',        `CREATE INDEX IF NOT EXISTS idx_bookings_customer      ON bookings(customer_id)`);
  await run('index: bookings_professional',    `CREATE INDEX IF NOT EXISTS idx_bookings_professional  ON bookings(professional_id)`);
  await run('index: reviews_professional',     `CREATE INDEX IF NOT EXISTS idx_reviews_professional   ON reviews(professional_id)`);
  await run('index: favorites_customer',       `CREATE INDEX IF NOT EXISTS idx_favorites_customer     ON favorites(customer_id)`);

  console.log('[migrate] Done ✓');
  await sql.end();
}

migrate().catch((err) => {
  console.error('[migrate] Failed:', err.message ?? err);
  process.exit(1);
});
