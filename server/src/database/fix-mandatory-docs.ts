import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(
    sql`UPDATE document_type_configs
        SET is_mandatory = false
        WHERE type_key IN ('aadhaar_front','aadhaar_back','pan_card','bank_passbook','profile_photo')`
  );
  console.log('[fix] document_type_configs updated:', (result as any).rowCount ?? 'ok');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
