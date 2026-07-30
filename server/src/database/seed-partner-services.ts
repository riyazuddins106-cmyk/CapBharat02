/**
 * Links the test partner (partner@servenow.in) to ALL active services in the
 * catalog so that dispatch.broadcast() always finds at least one candidate
 * regardless of which service a customer books.
 *
 * Run with:
 *   pnpm --filter @servenow/server exec tsx src/database/seed-partner-services.ts
 *
 * Safe to re-run — inserts use ON CONFLICT DO NOTHING.
 */
import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL / SUPABASE_DATABASE_URL is not set');

const sql = postgres(url, { ssl: 'require', max: 1 });

async function main() {
  console.log('[seed-partner-services] Starting…');

  // Resolve partner professional record dynamically — no hardcoded UUIDs.
  const [pro] = await sql`
    SELECT p.id, u.full_name
    FROM professionals p
    JOIN users u ON u.id = p.user_id
    WHERE u.email = 'partner@servenow.in'
      AND p.deleted_at IS NULL
    LIMIT 1
  `;

  if (!pro) {
    console.error('  ✗ Test partner professional record not found.');
    console.error('    Run seed-test-accounts.ts first, then retry.');
    process.exit(1);
  }

  console.log(`  Partner: ${pro.full_name} (${pro.id})`);

  // Fetch all active services.
  const services = await sql`
    SELECT s.id, s.name
    FROM services s
    WHERE s.is_active = true AND s.deleted_at IS NULL
    ORDER BY s.name
  `;

  if (!services.length) {
    console.warn('  ⚠ No active services found — run seed-catalog first.');
    await sql.end();
    return;
  }

  let linked = 0;
  let skipped = 0;
  for (const svc of services) {
    const result = await sql`
      INSERT INTO partner_services (partner_id, service_id, created_at)
      VALUES (${pro.id}, ${svc.id}, NOW())
      ON CONFLICT DO NOTHING
    `;
    if (result.count > 0) {
      console.log(`  ✓ Linked: ${svc.name}`);
      linked++;
    } else {
      skipped++;
    }
  }

  console.log(`[seed-partner-services] Done ✓  linked=${linked}  already_existed=${skipped}`);
  await sql.end();
}

main().catch(err => {
  console.error('[seed-partner-services] Failed:', err);
  process.exit(1);
});
