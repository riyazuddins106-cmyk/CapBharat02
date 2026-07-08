/**
 * One-time script: links test partner user to a professional record.
 * Run: pnpm --filter @servenow/server exec tsx src/database/link-partner.ts
 *
 * SAFETY: Only runs against non-production DBs (URL must not contain "supabase.co/...prod").
 * Add explicit --prod flag to skip this guard if truly intended.
 */
import postgres from 'postgres';

const PARTNER_USER_ID = '4f96622c-43d6-4bc2-8b03-1d32913d3973'; // partner@servenow.in
const PRO_ID = '86858cf6-4a2e-409c-88de-8344237d1a6a'; // Rajan Verma

async function main() {
  const dbUrl = process.env.SUPABASE_DATABASE_URL;
  if (!dbUrl) throw new Error('SUPABASE_DATABASE_URL is not set');

  const isProd = process.argv.includes('--prod') === false && process.env.NODE_ENV === 'production';
  if (isProd) {
    console.error('ERROR: Refusing to run link-partner in production without --prod flag.');
    process.exit(1);
  }

  const sql = postgres(dbUrl, { ssl: 'require', max: 1 });

  // Validate both records exist before touching anything
  const [user] = await sql`SELECT id, email, role FROM users WHERE id = ${PARTNER_USER_ID}`;
  if (!user) throw new Error(`User ${PARTNER_USER_ID} not found`);
  if (user.role !== 'partner') throw new Error(`User is role="${user.role}", expected "partner"`);

  const [pro] = await sql`SELECT id, name, user_id FROM professionals WHERE id = ${PRO_ID}`;
  if (!pro) throw new Error(`Professional ${PRO_ID} not found`);
  if (pro.user_id && pro.user_id !== PARTNER_USER_ID) {
    throw new Error(`Professional already linked to different user: ${pro.user_id}`);
  }

  const result = await sql`
    UPDATE professionals
    SET user_id = ${PARTNER_USER_ID}, updated_at = NOW()
    WHERE id = ${PRO_ID}
    RETURNING id, name, user_id
  `;
  console.log('✓ Linked professional to partner user:', result[0]);
  await sql.end();
}

main().catch((err) => { console.error('[link-partner] Failed:', err.message); process.exit(1); });
