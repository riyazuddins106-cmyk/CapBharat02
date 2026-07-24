/**
 * Run with: ./node_modules/.bin/tsx src/database/migrate.ts
 * Creates all tables. Safe to run multiple times (IF NOT EXISTS).
 */
import 'dotenv/config';
import postgres from 'postgres';

// Prefer the explicitly configured Supabase connection. Some imported
// environments retain a stale DATABASE_URL from the original project.
const url = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

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

export async function runMigrations() {
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

  await run('column: users.push_token',
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token VARCHAR(255)`);

  await run('table: audit_logs', `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(64) NOT NULL,
      target_type VARCHAR(32) NOT NULL,
      target_id UUID,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await run('index: audit_logs_admin', `CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id)`);
  await run('index: audit_logs_created', `CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)`);

  await run('enum: payment_status',
    `CREATE TYPE payment_status AS ENUM ('created', 'paid', 'failed', 'refunded')`);
  await run('enum: payment_method',
    `CREATE TYPE payment_method AS ENUM ('card', 'netbanking', 'upi', 'wallet', 'other')`);

  await run('table: payments', `
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      currency VARCHAR(8) NOT NULL DEFAULT 'INR',
      status payment_status NOT NULL DEFAULT 'created',
      method payment_method,
      razorpay_order_id VARCHAR(128) NOT NULL,
      razorpay_payment_id VARCHAR(128),
      razorpay_signature VARCHAR(256),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await run('index: payments_booking', `CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id)`);
  await run('index: payments_customer', `CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id)`);

  await run('enum: payout_status',
    `CREATE TYPE payout_status AS ENUM ('pending', 'paid', 'rejected')`);

  await run('table: payout_requests', `
    CREATE TABLE IF NOT EXISTS payout_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      status payout_status NOT NULL DEFAULT 'pending',
      note VARCHAR(512),
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )`);
  await run('index: payout_requests_professional', `CREATE INDEX IF NOT EXISTS idx_payout_requests_professional ON payout_requests(professional_id)`);

  await run('enum: ticket_status',
    `CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'closed')`);

  await run('table: support_tickets', `
    CREATE TABLE IF NOT EXISTS support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(128) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status ticket_status NOT NULL DEFAULT 'open',
      response TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await run('index: support_tickets_user', `CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id)`);
  await run('index: support_tickets_status', `CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status)`);

  await run('table: notifications', `
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      body VARCHAR(512) NOT NULL,
      type VARCHAR(64) NOT NULL DEFAULT 'system',
      is_read BOOLEAN NOT NULL DEFAULT false,
      data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await run('index: notifications_user', `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
  await run('index: notifications_created', `CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)`);

  await run('enum: points_entry_type',
    `CREATE TYPE points_entry_type AS ENUM ('earn', 'redeem', 'adjust')`);

  await run('table: points_ledger', `
    CREATE TABLE IF NOT EXISTS points_ledger (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
      type points_entry_type NOT NULL,
      points INTEGER NOT NULL,
      description VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await run('index: points_ledger_user', `CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger(user_id)`);
  await run('index: points_ledger_booking', `CREATE INDEX IF NOT EXISTS idx_points_ledger_booking ON points_ledger(booking_id)`);

  await run('table: platform_policies', `
    CREATE TABLE IF NOT EXISTS platform_policies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug VARCHAR(64) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  await run('table: offers', `
    CREATE TABLE IF NOT EXISTS offers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      subtitle VARCHAR(255) NOT NULL DEFAULT '',
      tag VARCHAR(64) NOT NULL DEFAULT 'LIMITED OFFER',
      discount_text VARCHAR(64) NOT NULL DEFAULT '',
      bg_color VARCHAR(16) NOT NULL DEFAULT '#5B3EF5',
      cta_text VARCHAR(64) NOT NULL DEFAULT 'Book Now',
      cta_route VARCHAR(128) NOT NULL DEFAULT '/(tabs)/services',
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await run('index: offers_active', `CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(is_active)`);

  // ── Phase 1: Admin-controlled service marketplace ────────────────────────

  await run('enum: user_role → operations_manager',
    `DO $$ BEGIN ALTER TYPE user_role ADD VALUE 'operations_manager'; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  await run('column: professionals.availability_status',
    `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS availability_status VARCHAR(16) NOT NULL DEFAULT 'offline'`);
  await run('column: professionals.latitude',
    `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`);
  await run('column: professionals.longitude',
    `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`);
  await run('column: professionals.completed_jobs',
    `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS completed_jobs INTEGER NOT NULL DEFAULT 0`);
  await run('column: professionals.acceptance_rate',
    `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS acceptance_rate DOUBLE PRECISION NOT NULL DEFAULT 0`);
  await run('column: professionals.current_booking_status',
    `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS current_booking_status VARCHAR(16) NOT NULL DEFAULT 'available'`);

  await run('table: services', `
    CREATE TABLE IF NOT EXISTS services (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id      UUID NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
      sub_category_id  UUID REFERENCES sub_service_categories(id) ON DELETE SET NULL,
      name             VARCHAR(255) NOT NULL,
      description      TEXT,
      images           JSONB NOT NULL DEFAULT '[]',
      customer_price   INTEGER NOT NULL DEFAULT 0,
      partner_payout   INTEGER NOT NULL DEFAULT 0,
      commission       INTEGER NOT NULL DEFAULT 0,
      duration         INTEGER NOT NULL DEFAULT 60,
      required_skill   VARCHAR(255),
       badge            VARCHAR(64),
       featured         BOOLEAN NOT NULL DEFAULT false,
      is_active        BOOLEAN NOT NULL DEFAULT true,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at       TIMESTAMPTZ
    )`);
  await run('column: services.badge',
    `ALTER TABLE services ADD COLUMN IF NOT EXISTS badge VARCHAR(64)`);
  await run('column: services.featured',
    `ALTER TABLE services ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false`);
  await run('index: services_category',    `CREATE INDEX IF NOT EXISTS idx_services_category    ON services(category_id)`);
  await run('index: services_subcategory', `CREATE INDEX IF NOT EXISTS idx_services_subcategory ON services(sub_category_id)`);
  await run('index: services_active',      `CREATE INDEX IF NOT EXISTS idx_services_active      ON services(is_active)`);

  await run('table: partner_services', `
    CREATE TABLE IF NOT EXISTS partner_services (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(partner_id, service_id)
    )`);
  await run('index: partner_services_partner', `CREATE INDEX IF NOT EXISTS idx_partner_services_partner ON partner_services(partner_id)`);
  await run('index: partner_services_service', `CREATE INDEX IF NOT EXISTS idx_partner_services_service ON partner_services(service_id)`);

  await run('table: booking_partner_requests', `
    CREATE TABLE IF NOT EXISTS booking_partner_requests (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      partner_id   UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      status       VARCHAR(32) NOT NULL DEFAULT 'pending',
      sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      responded_at TIMESTAMPTZ
    )`);
  await run('index: booking_partner_requests_booking', `CREATE INDEX IF NOT EXISTS idx_bpr_booking ON booking_partner_requests(booking_id)`);
  await run('index: booking_partner_requests_partner', `CREATE INDEX IF NOT EXISTS idx_bpr_partner ON booking_partner_requests(partner_id)`);

  await run('table: booking_assignment_logs', `
    CREATE TABLE IF NOT EXISTS booking_assignment_logs (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      partner_id          UUID REFERENCES professionals(id) ON DELETE SET NULL,
      action              VARCHAR(64) NOT NULL,
      assigned_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await run('index: booking_assignment_logs_booking', `CREATE INDEX IF NOT EXISTS idx_bal_booking ON booking_assignment_logs(booking_id)`);

  await run('column: bookings.professional_id nullable',
    `ALTER TABLE bookings ALTER COLUMN professional_id DROP NOT NULL`);
  await run('column: bookings.pro_name nullable',
    `ALTER TABLE bookings ALTER COLUMN pro_name DROP NOT NULL`);
  await run('column: bookings.assignment_type',
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(16) NOT NULL DEFAULT 'auto'`);
  await run('column: bookings.assigned_by',
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id) ON DELETE SET NULL`);
  await run('column: bookings.dispatch_status',
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dispatch_status VARCHAR(32) NOT NULL DEFAULT 'searching_partner'`);
  await run('column: bookings.dispatch_deadline',
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dispatch_deadline TIMESTAMPTZ`);

  await run('table: carts', `
    CREATE TABLE IF NOT EXISTS carts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await run('table: cart_items', `
    CREATE TABLE IF NOT EXISTS cart_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
      service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(cart_id, service_id)
    )`);
  await run('table: booking_items', `
    CREATE TABLE IF NOT EXISTS booking_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_customer_price INTEGER NOT NULL,
      unit_partner_payout INTEGER NOT NULL,
      line_total INTEGER NOT NULL,
      duration INTEGER NOT NULL DEFAULT 60,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await run('index: cart_items_cart', `CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id)`);
  await run('index: booking_items_booking', `CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id)`);

  // ── Partner Documents (KYC / verification) ───────────────────────────
  await run('table: partner_documents', `
    CREATE TABLE IF NOT EXISTS partner_documents (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      professional_id  UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      document_type    VARCHAR(64) NOT NULL,
      document_url     TEXT NOT NULL,
      file_name        VARCHAR(255),
      status           VARCHAR(20) NOT NULL DEFAULT 'pending',
      rejection_reason TEXT,
      uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at      TIMESTAMPTZ,
      UNIQUE(professional_id, document_type)
    )`);
  await run('index: partner_documents_professional',
    `CREATE INDEX IF NOT EXISTS idx_partner_docs_professional ON partner_documents(professional_id)`);

  // ── Document verification enhancements ─────────────────────────────────
  await run('column: partner_documents.reviewed_by',
    `ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL`);
  await run('column: partner_documents.version',
    `ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1`);
  await run('column: partner_documents.expiry_date',
    `ALTER TABLE partner_documents ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ`);

  await run('table: document_type_configs', `
    CREATE TABLE IF NOT EXISTS document_type_configs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type_key    VARCHAR(64) NOT NULL UNIQUE,
      label       VARCHAR(255) NOT NULL,
      description TEXT,
      emoji       VARCHAR(16) NOT NULL DEFAULT '📄',
      is_mandatory BOOLEAN NOT NULL DEFAULT true,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await run('index: document_type_configs_key',
    `CREATE INDEX IF NOT EXISTS idx_doc_type_configs_key ON document_type_configs(type_key)`);

  await run('table: partner_document_history', `
    CREATE TABLE IF NOT EXISTS partner_document_history (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      document_type   VARCHAR(64) NOT NULL,
      document_url    TEXT NOT NULL,
      file_name       VARCHAR(255),
      status          VARCHAR(20) NOT NULL,
      rejection_reason TEXT,
      reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
      version         INTEGER NOT NULL DEFAULT 1,
      uploaded_at     TIMESTAMPTZ NOT NULL,
      reviewed_at     TIMESTAMPTZ,
      archived_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await run('index: partner_document_history_pro',
    `CREATE INDEX IF NOT EXISTS idx_pdh_professional ON partner_document_history(professional_id)`);
  await run('index: partner_document_history_type',
    `CREATE INDEX IF NOT EXISTS idx_pdh_type ON partner_document_history(professional_id, document_type)`);

  // Seed default document types (idempotent)
  const defaultTypes = [
    { key: 'aadhaar_front',       label: 'Aadhaar Card (Front)',     desc: 'Front side of your Aadhaar card',           emoji: '🪪', mandatory: true,  order: 1  },
    { key: 'aadhaar_back',        label: 'Aadhaar Card (Back)',      desc: 'Back side of your Aadhaar card',            emoji: '🪪', mandatory: true,  order: 2  },
    { key: 'pan_card',            label: 'PAN Card',                 desc: 'Your PAN card (Income Tax ID)',              emoji: '💳', mandatory: true,  order: 3  },
    { key: 'bank_passbook',       label: 'Bank Passbook / Cheque',   desc: 'Cancelled cheque or passbook first page',   emoji: '🏦', mandatory: true,  order: 4  },
    { key: 'profile_photo',       label: 'Profile Photo',            desc: 'Clear passport-size face photo',            emoji: '📸', mandatory: true,  order: 5  },
    { key: 'driving_license',     label: 'Driving License',          desc: 'Valid driving license',                     emoji: '🚗', mandatory: false, order: 6  },
    { key: 'police_verification', label: 'Police Verification',      desc: 'Police clearance certificate',              emoji: '👮', mandatory: false, order: 7  },
    { key: 'gst_certificate',     label: 'GST Certificate',          desc: 'GST registration certificate',              emoji: '📋', mandatory: false, order: 8  },
    { key: 'trade_license',       label: 'Trade License',            desc: 'Trade or business license',                 emoji: '🏪', mandatory: false, order: 9  },
    { key: 'service_certificate', label: 'Service Certificate',      desc: 'Skill certificate or trade diploma',        emoji: '🎓', mandatory: false, order: 10 },
  ];
  for (const dt of defaultTypes) {
    await run(`seed: document_type ${dt.key}`,
      `INSERT INTO document_type_configs (type_key, label, description, emoji, is_mandatory, sort_order)
       VALUES ('${dt.key}', '${dt.label.replace(/'/g, "''")}', '${dt.desc.replace(/'/g, "''")}', '${dt.emoji}', ${dt.mandatory}, ${dt.order})
       ON CONFLICT (type_key) DO NOTHING`);
  }

  console.log('[migrate] Done ✓');
  await sql.end();
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations().catch((err) => {
  console.error('[migrate] Failed:', err.message ?? err);
  process.exit(1);
  });
}
