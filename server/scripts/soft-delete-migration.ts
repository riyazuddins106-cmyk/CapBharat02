/**
 * Migration: add deleted_at to offers, reels, reviews, platform_policies, sub_service_categories
 * Run: pnpm --filter @servenow/server tsx src/database/soft-delete-migration.ts
 */
import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.SUPABASE_DATABASE_URL!);

async function run(label: string, query: string) {
  try {
    await sql.unsafe(query);
    console.log(`✓ ${label}`);
  } catch (e: any) {
    if (e.code === '42701') {
      console.log(`– ${label} (column already exists, skipped)`);
    } else {
      console.error(`✗ ${label}:`, e.message);
    }
  }
}

await run('offers.deleted_at',                  'ALTER TABLE offers ADD COLUMN deleted_at TIMESTAMPTZ');
await run('reels.deleted_at',                   'ALTER TABLE reels ADD COLUMN deleted_at TIMESTAMPTZ');
await run('reviews.deleted_at',                 'ALTER TABLE reviews ADD COLUMN deleted_at TIMESTAMPTZ');
await run('platform_policies.deleted_at',       'ALTER TABLE platform_policies ADD COLUMN deleted_at TIMESTAMPTZ');
await run('sub_service_categories.deleted_at',  'ALTER TABLE sub_service_categories ADD COLUMN deleted_at TIMESTAMPTZ');

await sql.end();
console.log('\nDone.');
