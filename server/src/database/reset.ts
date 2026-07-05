/**
 * Drops old incompatible tables and recreates the full schema.
 * Run with: ./node_modules/.bin/tsx src/database/reset.ts
 */
import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.SUPABASE_DATABASE_URL;
if (!url) throw new Error('SUPABASE_DATABASE_URL is not set');
const sql = postgres(url, { ssl: 'require', max: 1 });

async function q(label: string, query: string) {
  try {
    await sql.unsafe(query);
    console.log(`  ✓ ${label}`);
  } catch (e: any) {
    console.warn(`  ⚠ ${label}: ${e?.message}`);
  }
}

async function main() {
  console.log('[reset] Dropping old tables…');
  await q('drop reviews',           'DROP TABLE IF EXISTS reviews CASCADE');
  await q('drop bookings',          'DROP TABLE IF EXISTS bookings CASCADE');
  await q('drop favorites',         'DROP TABLE IF EXISTS favorites CASCADE');
  await q('drop professionals',     'DROP TABLE IF EXISTS professionals CASCADE');
  await q('drop services',          'DROP TABLE IF EXISTS services CASCADE');
  await q('drop vendors',           'DROP TABLE IF EXISTS vendors CASCADE');
  await q('drop addresses',         'DROP TABLE IF EXISTS addresses CASCADE');
  await q('drop otp_codes',         'DROP TABLE IF EXISTS otp_codes CASCADE');
  await q('drop refresh_tokens',    'DROP TABLE IF EXISTS refresh_tokens CASCADE');
  await q('drop service_categories','DROP TABLE IF EXISTS service_categories CASCADE');
  await q('drop users',             'DROP TABLE IF EXISTS users CASCADE');

  await q('drop enum booking_status', 'DROP TYPE IF EXISTS booking_status CASCADE');
  await q('drop enum user_role',      'DROP TYPE IF EXISTS user_role CASCADE');

  console.log('[reset] Creating enums…');
  await q('enum user_role',     `CREATE TYPE user_role AS ENUM ('customer', 'partner', 'admin')`);
  await q('enum booking_status',`CREATE TYPE booking_status AS ENUM ('pending', 'upcoming', 'in_progress', 'completed', 'cancelled')`);

  console.log('[reset] Creating tables…');

  await q('users', `
    CREATE TABLE users (
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

  await q('refresh_tokens', `
    CREATE TABLE refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  await q('otp_codes', `
    CREATE TABLE otp_codes (
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

  await q('addresses', `
    CREATE TABLE addresses (
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

  await q('service_categories', `
    CREATE TABLE service_categories (
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

  await q('professionals', `
    CREATE TABLE professionals (
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

  await q('bookings', `
    CREATE TABLE bookings (
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

  await q('reviews', `
    CREATE TABLE reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
      customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  await q('favorites', `
    CREATE TABLE favorites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(customer_id, professional_id)
    )`);

  console.log('[reset] Creating indexes…');
  await q('idx professionals_category', 'CREATE INDEX idx_professionals_category ON professionals(category_id)');
  await q('idx bookings_customer',      'CREATE INDEX idx_bookings_customer      ON bookings(customer_id)');
  await q('idx bookings_professional',  'CREATE INDEX idx_bookings_professional  ON bookings(professional_id)');
  await q('idx reviews_professional',   'CREATE INDEX idx_reviews_professional   ON reviews(professional_id)');
  await q('idx favorites_customer',     'CREATE INDEX idx_favorites_customer     ON favorites(customer_id)');

  console.log('[reset] Schema created ✓');
  await sql.end();
}

main().catch((e) => { console.error('[reset] Failed:', e.message); process.exit(1); });
