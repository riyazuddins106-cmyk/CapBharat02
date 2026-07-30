/**
 * Seeds three test accounts (admin, customer, partner) and a professional
 * record for the partner, with availability_status = 'available' so the
 * dispatch flow works out of the box.
 *
 * Run with:
 *   pnpm --filter @servenow/server exec tsx src/database/seed-test-accounts.ts
 *
 * Safe to re-run — all inserts use ON CONFLICT DO NOTHING / DO UPDATE.
 */
import 'dotenv/config';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const url = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL / SUPABASE_DATABASE_URL is not set');

const sql = postgres(url, { ssl: 'require', max: 1 });

async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

async function main() {
  console.log('[seed-test-accounts] Starting…');

  // ── 1. Users ───────────────────────────────────────────────────────────────
  const adminHash    = await hashPassword('Admin@1234');
  const partnerHash  = await hashPassword('Partner@1234');
  const customerHash = await hashPassword('Customer@1234');

  const now = new Date().toISOString();

  // Admin
  await sql`
    INSERT INTO users (email, full_name, password_hash, role, email_verified_at, is_active, created_at, updated_at)
    VALUES ('admin@servenow.in', 'Admin User', ${adminHash}, 'admin', ${now}, true, ${now}, ${now})
    ON CONFLICT (email) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          email_verified_at = COALESCE(users.email_verified_at, EXCLUDED.email_verified_at),
          updated_at = ${now}
  `;
  console.log('  ✓ admin@servenow.in');

  // Customer
  await sql`
    INSERT INTO users (email, full_name, password_hash, role, email_verified_at, is_active, created_at, updated_at)
    VALUES ('customer@servenow.in', 'Test Customer', ${customerHash}, 'customer', ${now}, true, ${now}, ${now})
    ON CONFLICT (email) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          email_verified_at = COALESCE(users.email_verified_at, EXCLUDED.email_verified_at),
          updated_at = ${now}
  `;
  console.log('  ✓ customer@servenow.in');

  // Partner
  await sql`
    INSERT INTO users (email, full_name, password_hash, role, email_verified_at, is_active, created_at, updated_at)
    VALUES ('partner@servenow.in', 'Test Partner', ${partnerHash}, 'partner', ${now}, true, ${now}, ${now})
    ON CONFLICT (email) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          email_verified_at = COALESCE(users.email_verified_at, EXCLUDED.email_verified_at),
          updated_at = ${now}
  `;
  console.log('  ✓ partner@servenow.in');

  // ── 2. Professional record for the partner ─────────────────────────────────
  // Find the partner user id and an arbitrary category to attach to.
  const [partnerUser] = await sql`SELECT id FROM users WHERE email = 'partner@servenow.in'`;
  const [firstCategory] = await sql`SELECT id FROM service_categories WHERE is_active = true ORDER BY sort_order LIMIT 1`;

  if (!firstCategory) {
    console.warn('  ⚠ No service categories found — run seed-catalog first, then re-run this script.');
  } else {
    await sql`
      INSERT INTO professionals (
        user_id, category_id, name, title, bio,
        is_active, availability_status, rating, review_count,
        base_price, price_unit, created_at, updated_at
      )
      VALUES (
        ${partnerUser.id}, ${firstCategory.id},
        'Test Partner', 'Home Services Professional',
        'Experienced professional available for home services.',
        true,
        'available',   -- Fix 4: start available so dispatch finds this partner immediately
        4.5, 10, 500, '/visit', ${now}, ${now}
      )
      ON CONFLICT (user_id) DO UPDATE
        SET availability_status = 'available',
            is_active = true,
            updated_at = ${now}
    `;
    console.log('  ✓ professionals record (availability_status = available)');
  }

  // ── 3. Backfill: any existing offline professionals → available ────────────
  const { count } = await sql`
    UPDATE professionals
    SET availability_status = 'available', updated_at = ${now}
    WHERE availability_status = 'offline' AND deleted_at IS NULL
    RETURNING id
  `.then(rows => ({ count: rows.length }));
  if (count > 0) console.log(`  ✓ backfilled ${count} offline professional(s) → available`);

  console.log('[seed-test-accounts] Done ✓');
  await sql.end();
}

main().catch(err => {
  console.error('[seed-test-accounts] Failed:', err);
  process.exit(1);
});
