/**
 * Creates the platform_settings table if it does not already exist.
 * Run from server/:
 *   npx tsx scripts/add-platform-settings-table.ts
 */
import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) { console.error('Missing SUPABASE_DATABASE_URL'); process.exit(1); }

const sql = postgres(url, { ssl: 'require' });

await sql`
  CREATE TABLE IF NOT EXISTS platform_settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         VARCHAR(64) NOT NULL UNIQUE,
    value       TEXT        NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

console.log('✓ platform_settings table ready');
await sql.end();
