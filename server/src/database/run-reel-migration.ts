import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';

async function main() {
  await db.execute(sql`
    ALTER TABLE reels
      ADD COLUMN IF NOT EXISTS platform             varchar(32)  NOT NULL DEFAULT 'unknown',
      ADD COLUMN IF NOT EXISTS custom_thumbnail_url varchar(512),
      ADD COLUMN IF NOT EXISTS category             varchar(128),
      ADD COLUMN IF NOT EXISTS service_category_id  uuid REFERENCES service_categories(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS featured             boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS publish_date         timestamptz,
      ADD COLUMN IF NOT EXISTS expiry_date          timestamptz,
      ADD COLUMN IF NOT EXISTS click_count          integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS view_count           integer NOT NULL DEFAULT 0
  `);
  console.log('Reel migration OK');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
