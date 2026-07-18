/**
 * One-shot migration: add icon_name, color, icon_color to sub_service_categories
 * Run with: pnpm exec tsx scripts/add-subcategory-columns.ts
 */
import postgres from 'postgres';
import 'dotenv/config';

const url = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error('No database URL found');

const sql = postgres(url, { prepare: false, ssl: 'require' });

async function run() {
  console.log('Checking/adding columns to sub_service_categories...');

  // Check which columns already exist
  const existing = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'sub_service_categories'
      AND column_name  IN ('icon_name', 'color', 'icon_color')
  `;
  const existingSet = new Set(existing.map((r: any) => r.column_name));
  console.log('Existing columns:', [...existingSet]);

  if (!existingSet.has('icon_name')) {
    await sql`ALTER TABLE sub_service_categories ADD COLUMN icon_name varchar(128) NOT NULL DEFAULT 'tag-outline'`;
    console.log('✓ Added icon_name');
  } else {
    console.log('  icon_name already exists');
  }

  if (!existingSet.has('color')) {
    await sql`ALTER TABLE sub_service_categories ADD COLUMN color varchar(32) NOT NULL DEFAULT '#5B3EF5'`;
    console.log('✓ Added color');
  } else {
    console.log('  color already exists');
  }

  if (!existingSet.has('icon_color')) {
    await sql`ALTER TABLE sub_service_categories ADD COLUMN icon_color varchar(32) NOT NULL DEFAULT '#ffffff'`;
    console.log('✓ Added icon_color');
  } else {
    console.log('  icon_color already exists');
  }

  // Verify
  const all = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sub_service_categories'
    ORDER BY ordinal_position
  `;
  console.log('\nAll columns:', all.map((r: any) => r.column_name).join(', '));
  await sql.end();
  console.log('\nDone.');
}

run().catch((e) => { console.error(e); process.exit(1); });
