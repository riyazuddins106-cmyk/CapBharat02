/**
 * One-time migration: adds UNIQUE constraint on professionals.user_id
 * so one partner user can only be linked to one professional record.
 * Run: pnpm --filter @servenow/server exec tsx src/database/add-unique-constraint.ts
 */
import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const dbUrl = process.env.SUPABASE_DATABASE_URL;
  if (!dbUrl) throw new Error('SUPABASE_DATABASE_URL is not set');

  const sql = postgres(dbUrl, { ssl: 'require', max: 1 });

  // Clear any stale duplicate user_id linkages, keeping the earliest-created row
  // (the one explicitly set by link-partner.ts) for each user.
  const cleared = await sql`
    UPDATE professionals
    SET user_id = NULL, updated_at = NOW()
    WHERE user_id IS NOT NULL
      AND id NOT IN (
        SELECT DISTINCT ON (user_id) id
        FROM professionals
        WHERE user_id IS NOT NULL
        ORDER BY user_id, created_at ASC
      )
    RETURNING id, name
  `;
  if (cleared.length > 0) {
    console.log(`Cleared stale linkages from ${cleared.length} row(s):`, cleared.map(r => r.name));
  }

  // Now add the unique constraint (idempotent)
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'professionals_user_id_unique'
      ) THEN
        ALTER TABLE professionals
          ADD CONSTRAINT professionals_user_id_unique UNIQUE (user_id);
        RAISE NOTICE 'Constraint added.';
      ELSE
        RAISE NOTICE 'Constraint already exists — skipped.';
      END IF;
    END $$;
  `;

  console.log('✓ professionals.user_id unique constraint ensured');
  await sql.end();
}

main().catch((err) => {
  console.error('[migration] Failed:', err.message);
  process.exit(1);
});
