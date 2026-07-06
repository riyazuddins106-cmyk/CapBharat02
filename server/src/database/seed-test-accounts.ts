/**
 * Seeds one test account per role: admin, partner, customer.
 * Run: pnpm --filter @servenow/server tsx src/database/seed-test-accounts.ts
 *
 * Credentials printed at the end — safe to re-run (upserts by email).
 */
import 'dotenv/config';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres(process.env.SUPABASE_DATABASE_URL!, { ssl: 'require', max: 1 });

const ACCOUNTS = [
  { email: 'admin@servenow.in',    password: 'Admin@1234',    fullName: 'Super Admin',    role: 'admin'    },
  { email: 'partner@servenow.in',  password: 'Partner@1234',  fullName: 'Test Partner',   role: 'partner'  },
  { email: 'customer@servenow.in', password: 'Customer@1234', fullName: 'Test Customer',  role: 'customer' },
];

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  ServeNow — Test Account Seeder');
  console.log('══════════════════════════════════════════\n');

  for (const acct of ACCOUNTS) {
    const hash = await bcrypt.hash(acct.password, 10);
    await sql`
      INSERT INTO users (email, full_name, role, password_hash, is_active, email_verified_at)
      VALUES (
        ${acct.email},
        ${acct.fullName},
        ${acct.role},
        ${hash},
        true,
        NOW()
      )
      ON CONFLICT (email) DO UPDATE
        SET password_hash     = EXCLUDED.password_hash,
            role              = EXCLUDED.role,
            is_active         = true,
            email_verified_at = COALESCE(users.email_verified_at, NOW()),
            updated_at        = NOW()
    `;
    console.log(`  ✓ ${acct.role.padEnd(8)}  ${acct.email}  /  ${acct.password}`);
  }

  await sql.end();
  console.log('\n[seed] Done ✓');
  console.log('\n══════════════════════════════════════════');
  console.log('  LOGIN CREDENTIALS');
  console.log('══════════════════════════════════════════');
  for (const a of ACCOUNTS) {
    console.log(`  ${a.role.toUpperCase().padEnd(9)} ${a.email}   pw: ${a.password}`);
  }
  console.log('══════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('[seed] Failed:', err.message ?? err);
  process.exit(1);
});
