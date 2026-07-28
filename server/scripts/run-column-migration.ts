/**
 * One-off migration: add missing columns to service_categories and sub_service_categories
 * Run with: npx tsx src/database/run-column-migration.ts
 */
import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error('No database URL found');

const sql = postgres(url, { ssl: 'require' });

async function main() {
  console.log('Adding missing columns...');

  await sql`
    ALTER TABLE service_categories
      ADD COLUMN IF NOT EXISTS image_url   varchar(512),
      ADD COLUMN IF NOT EXISTS featured    boolean NOT NULL DEFAULT false
  `;
  console.log('✓ service_categories patched');

  await sql`
    ALTER TABLE sub_service_categories
      ADD COLUMN IF NOT EXISTS image_url   varchar(512),
      ADD COLUMN IF NOT EXISTS featured    boolean NOT NULL DEFAULT false
  `;
  console.log('✓ sub_service_categories patched');

  await sql.end();
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
