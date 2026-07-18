/**
 * Migrates the payments table:
 *  - Makes razorpay_order_id nullable (needed for COD / UPI manual payments)
 *  - Adds 'cash' and 'upi_manual' values to the payment_method enum
 * Run:  cd server && pnpm exec tsx src/database/run-payment-migration.ts
 */
import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.SUPABASE_DATABASE_URL;
if (!url) throw new Error('SUPABASE_DATABASE_URL not set');
const sql = postgres(url, { ssl: 'require', max: 1 });

async function main() {
  console.log('Running payment migration…');

  // 1. Add enum values (IF NOT EXISTS is not supported for enum in older PG,
  //    so we check pg_enum first)
  const existing: { enumlabel: string }[] = await sql`
    SELECT enumlabel FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'payment_method'
  `;
  const labels = new Set(existing.map(r => r.enumlabel));

  if (!labels.has('cash')) {
    await sql`ALTER TYPE payment_method ADD VALUE 'cash'`;
    console.log('  + added enum value: cash');
  } else {
    console.log('  ✓ cash already in payment_method enum');
  }

  if (!labels.has('upi_manual')) {
    await sql`ALTER TYPE payment_method ADD VALUE 'upi_manual'`;
    console.log('  + added enum value: upi_manual');
  } else {
    console.log('  ✓ upi_manual already in payment_method enum');
  }

  // 2. Make razorpay_order_id nullable
  await sql`ALTER TABLE payments ALTER COLUMN razorpay_order_id DROP NOT NULL`;
  console.log('  ✓ razorpay_order_id is now nullable');

  // 3. Add notes column if missing (stores UPI transaction ref / cash note)
  const cols: { column_name: string }[] = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'notes'
  `;
  if (!cols.length) {
    await sql`ALTER TABLE payments ADD COLUMN notes varchar(512)`;
    console.log('  + added column: notes');
  } else {
    console.log('  ✓ notes column already exists');
  }

  console.log('\nPayment migration complete ✓');
  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
