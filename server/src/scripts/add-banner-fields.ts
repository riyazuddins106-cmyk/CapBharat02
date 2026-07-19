/**
 * Migration: add new banner fields to the offers table.
 * Safe to run multiple times (IF NOT EXISTS on each column).
 */
import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('[migration] Adding banner fields to offers table…');
  await db.execute(sql`
    ALTER TABLE offers
      ADD COLUMN IF NOT EXISTS description    VARCHAR(500),
      ADD COLUMN IF NOT EXISTS image_url      VARCHAR(1000),
      ADD COLUMN IF NOT EXISTS alt_text       VARCHAR(255),
      ADD COLUMN IF NOT EXISTS text_position  VARCHAR(20)  NOT NULL DEFAULT 'bottom-left',
      ADD COLUMN IF NOT EXISTS overlay_color  VARCHAR(16)  NOT NULL DEFAULT '#000000',
      ADD COLUMN IF NOT EXISTS overlay_opacity REAL        NOT NULL DEFAULT 0.3,
      ADD COLUMN IF NOT EXISTS animation      VARCHAR(16)  NOT NULL DEFAULT 'slide',
      ADD COLUMN IF NOT EXISTS priority       INTEGER      NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS status         VARCHAR(16)  NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS start_date     TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS end_date       TIMESTAMPTZ
  `);
  console.log('[migration] ✓ Banner fields added.');
  process.exit(0);
}

run().catch(err => { console.error('[migration] Failed:', err); process.exit(1); });
