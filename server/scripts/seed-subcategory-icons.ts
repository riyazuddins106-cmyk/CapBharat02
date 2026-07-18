/**
 * Uploads a dummy placeholder icon (SVG) to Supabase storage for every
 * sub-category that has no imageUrl yet, then writes the public URL back
 * into the database.
 *
 * Run from the server/ directory:
 *   npx tsx scripts/seed-subcategory-icons.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { isNull, or, eq } from 'drizzle-orm';
import { subServiceCategories } from '../src/database/schema/index.js';

/* ── Supabase client ──────────────────────────────────────────────────── */
const SUPABASE_URL            = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CATEGORY_BUCKET         = 'categories';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

/* ── Database client ──────────────────────────────────────────────────── */
const DATABASE_URL = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing SUPABASE_DATABASE_URL env var.');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });
const db  = drizzle(sql);

/* ── SVG generator ────────────────────────────────────────────────────── */
function makePlaceholderSvg(bgColor: string, iconColor: string, letter: string): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="60" fill="${bgColor}"/>
  <text x="60" y="60" text-anchor="middle" dominant-baseline="central"
        font-family="system-ui,sans-serif" font-weight="700" font-size="52"
        fill="${iconColor}">${letter.toUpperCase()}</text>
</svg>`;
  return Buffer.from(svg, 'utf8');
}

/* ── Main ─────────────────────────────────────────────────────────────── */
async function main() {
  console.log('Fetching sub-categories without icons…');

  // Fetch ALL sub-categories (update even those that already have a URL —
  // change `where` below if you want to skip already-set ones)
  const rows = await db
    .select()
    .from(subServiceCategories)
    .orderBy(subServiceCategories.sortOrder, subServiceCategories.name);

  console.log(`Found ${rows.length} sub-categories. Uploading placeholder icons…\n`);

  let ok = 0, fail = 0;

  for (const row of rows) {
    const letter = (row.name ?? 'S').charAt(0);
    const buf    = makePlaceholderSvg(
      row.color     ?? '#5B3EF5',
      row.iconColor ?? '#ffffff',
      letter,
    );

    const storagePath = `subcategory-${row.id}-placeholder.svg`;

    const { error: uploadErr } = await supabase.storage
      .from(CATEGORY_BUCKET)
      .upload(storagePath, buf, {
        contentType : 'image/svg+xml',
        upsert      : true,
      });

    if (uploadErr) {
      console.error(`  ✗  [${row.name}] upload failed: ${uploadErr.message}`);
      fail++;
      continue;
    }

    const { data: urlData } = supabase.storage
      .from(CATEGORY_BUCKET)
      .getPublicUrl(storagePath);

    await db
      .update(subServiceCategories)
      .set({ imageUrl: urlData.publicUrl, updatedAt: new Date() })
      .where(eq(subServiceCategories.id, row.id));

    console.log(`  ✓  [${row.name}] → ${urlData.publicUrl}`);
    ok++;
  }

  console.log(`\nDone. ${ok} succeeded, ${fail} failed.`);
  await sql.end();
}

main().catch(err => { console.error(err); process.exit(1); });
