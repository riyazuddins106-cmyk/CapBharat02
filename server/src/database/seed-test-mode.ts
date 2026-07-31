/**
 * Enable test mode in the platform_settings table.
 *
 * Run with:
 *   pnpm --filter @servenow/server exec tsx src/database/seed-test-mode.ts
 *
 * What it does:
 *   - If payment_config exists: merges { testMode: { enabled: true } } into it,
 *     leaving all other settings (Stripe, Razorpay keys, etc.) untouched.
 *   - If payment_config doesn't exist yet: creates a default row with test mode on.
 *
 * To disable test mode again, open Admin → Payment Config and toggle it off.
 */
import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const sql = postgres(url, { ssl: 'require', max: 1 });

async function main() {
  console.log('[seed-test-mode] Connecting…');

  const rows = await sql`
    SELECT value FROM platform_settings WHERE key = 'payment_config' LIMIT 1
  `;

  if (rows.length === 0) {
    // No config yet — create a default one with test mode on
    const defaultCfg = {
      testMode: { enabled: true },
      cod:      { enabled: true },
      upi:      { enabled: false, vpa: '' },
      razorpay: { enabled: false, keyId: '', keySecret: '', webhookSecret: '' },
      stripe:   { enabled: false, publishableKey: '', secretKey: '', webhookSecret: '' },
    };
    await sql`
      INSERT INTO platform_settings (key, value)
      VALUES ('payment_config', ${JSON.stringify(defaultCfg)})
    `;
    console.log('  ✓ Created payment_config with testMode: enabled');
  } else {
    // Merge test mode flag into existing config
    const existing = JSON.parse(rows[0].value as string);
    const updated  = { ...existing, testMode: { enabled: true } };
    await sql`
      UPDATE platform_settings
      SET value = ${JSON.stringify(updated)}, updated_at = NOW()
      WHERE key = 'payment_config'
    `;
    console.log('  ✓ Updated payment_config → testMode: enabled');
  }

  await sql.end();
  console.log('[seed-test-mode] Done.');
}

main().catch((err) => { console.error(err); process.exit(1); });
