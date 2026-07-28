/**
 * Seeds the demo partner account with:
 *  - A professional profile linked to the partner user
 *  - A demo customer account
 *  - 12 bookings across all statuses (pending, upcoming, in_progress, completed, cancelled)
 *
 * Run: pnpm --filter @servenow/server tsx src/database/seed-partner.ts
 */
import 'dotenv/config';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres(process.env.SUPABASE_DATABASE_URL!, { ssl: 'require', max: 1 });

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(10, 0, 0, 0);
  return d;
}

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  ServeNow — Partner Demo Seeder');
  console.log('══════════════════════════════════════════\n');

  /* ── 1. Ensure demo partner user exists ── */
  console.log('👤 Ensuring partner user...');
  const partnerHash = await bcrypt.hash('Partner@123', 10);
  const [partnerUser] = await sql`
    INSERT INTO users (email, full_name, password_hash, role, email_verified_at, is_active)
    VALUES ('partner@servenow.com', 'Ravi Kumar', ${partnerHash}, 'partner', NOW(), true)
    ON CONFLICT (email) DO UPDATE SET
      full_name        = 'Ravi Kumar',
      role             = 'partner',
      email_verified_at = NOW(),
      is_active        = true
    RETURNING id, full_name
  `;
  console.log(`  ✓ Partner user: ${partnerUser.full_name} (${partnerUser.id})`);

  /* ── 2. Ensure demo customer user exists ── */
  console.log('👤 Ensuring customer user...');
  const custHash = await bcrypt.hash('Customer@123', 10);
  const [custUser] = await sql`
    INSERT INTO users (email, full_name, phone, password_hash, role, email_verified_at, is_active)
    VALUES ('customer@servenow.com', 'Priya Sharma', '+91 98765 43210', ${custHash}, 'customer', NOW(), true)
    ON CONFLICT (email) DO UPDATE SET
      full_name         = 'Priya Sharma',
      phone             = '+91 98765 43210',
      role              = 'customer',
      email_verified_at = NOW(),
      is_active         = true
    RETURNING id, full_name
  `;
  console.log(`  ✓ Customer user: ${custUser.full_name} (${custUser.id})`);

  /* ── 3. Fetch categories ── */
  console.log('📂 Fetching categories...');
  const categories = await sql`
    SELECT id, name FROM service_categories ORDER BY sort_order LIMIT 8
  `;
  if (categories.length === 0) throw new Error('No categories found — run seed-demo.ts first');
  const catMap: Record<string, string> = {};
  for (const c of categories) catMap[c.name] = c.id;
  console.log(`  ✓ Found ${categories.length} categories`);

  const cleaningId  = catMap['Cleaning']   ?? categories[0].id;
  const plumbingId  = catMap['Plumbing']   ?? categories[1]?.id ?? categories[0].id;
  const electricalId= catMap['Electrical'] ?? categories[2]?.id ?? categories[0].id;
  const salonId     = catMap['Salon']      ?? categories[3]?.id ?? categories[0].id;

  /* ── 4. Create or update the professional profile ── */
  console.log('🧑‍🔧 Upserting professional profile...');
  const [existingPro] = await sql`
    SELECT id FROM professionals WHERE user_id = ${partnerUser.id} AND deleted_at IS NULL LIMIT 1
  `;

  let proId: string;
  if (existingPro) {
    await sql`
      UPDATE professionals SET
        category_id  = ${cleaningId},
        name         = 'Ravi Kumar',
        title        = 'Home Cleaning Expert',
        bio          = 'Certified cleaning specialist with 6+ years of experience. Expert in deep cleaning, sanitisation, and eco-friendly products. 500+ happy customers across Mumbai.',
        rating       = 4.8,
        review_count = 127,
        base_price   = 599,
        price_unit   = '/visit',
        badge        = 'Top Rated',
        tags         = '["Deep Cleaning","Sanitisation","Eco-Friendly","Kitchen","Bathroom"]',
        is_active    = true,
        updated_at   = NOW()
      WHERE id = ${existingPro.id}
    `;
    proId = existingPro.id;
    console.log(`  ✓ Updated professional (${proId})`);
  } else {
    const [newPro] = await sql`
      INSERT INTO professionals
        (user_id, category_id, name, title, bio, rating, review_count, base_price, price_unit, badge, tags, is_active)
      VALUES (
        ${partnerUser.id},
        ${cleaningId},
        'Ravi Kumar',
        'Home Cleaning Expert',
        'Certified cleaning specialist with 6+ years of experience. Expert in deep cleaning, sanitisation, and eco-friendly products. 500+ happy customers across Mumbai.',
        4.8,
        127,
        599,
        '/visit',
        'Top Rated',
        '["Deep Cleaning","Sanitisation","Eco-Friendly","Kitchen","Bathroom"]',
        true
      )
      RETURNING id
    `;
    proId = newPro.id;
    console.log(`  ✓ Created professional (${proId})`);
  }

  /* ── 5. Create a demo address for the customer ── */
  console.log('📍 Upserting customer address...');
  const [existingAddr] = await sql`
    SELECT id FROM addresses WHERE user_id = ${custUser.id} AND deleted_at IS NULL LIMIT 1
  `;
  let addrId: string;
  if (existingAddr) {
    addrId = existingAddr.id;
    console.log(`  ✓ Address exists (${addrId})`);
  } else {
    const [addr] = await sql`
      INSERT INTO addresses (user_id, label, line1, line2, city, state, postal_code, country, is_default)
      VALUES (
        ${custUser.id},
        'Home',
        'Flat 4B, Lotus Apartments, Andheri West',
        'Near DN Nagar Metro Station',
        'Mumbai',
        'Maharashtra',
        '400053',
        'India',
        true
      )
      RETURNING id
    `;
    addrId = addr.id;
    console.log(`  ✓ Created address (${addrId})`);
  }

  /* ── 6. Delete existing demo bookings to avoid duplicates ── */
  console.log('🗑️  Clearing old demo bookings...');
  await sql`
    DELETE FROM bookings
    WHERE professional_id = ${proId}
      AND customer_id     = ${custUser.id}
  `;
  console.log('  ✓ Cleared');

  /* ── 7. Insert 12 bookings across all statuses ── */
  console.log('📅 Inserting demo bookings...');

  const jobs = [
    /* ─ UPCOMING (future, not yet started) ─ */
    {
      categoryId: cleaningId, serviceName: 'Deep Home Cleaning',
      status: 'upcoming', scheduledAt: daysFromNow(1),
      price: 1199, notes: 'Please bring eco-friendly cleaning supplies. 3 BHK apartment, focus on kitchen and bathrooms.',
    },
    {
      categoryId: plumbingId, serviceName: 'Bathroom Plumbing Repair',
      status: 'upcoming', scheduledAt: daysFromNow(3),
      price: 799, notes: 'Leaky faucet in master bathroom and running toilet in guest bathroom.',
    },
    {
      categoryId: cleaningId, serviceName: 'Post-Renovation Cleaning',
      status: 'upcoming', scheduledAt: daysFromNow(5),
      price: 2499, notes: 'Heavy dust and debris from recent renovation. Need full apartment cleaning.',
    },

    /* ─ PENDING (awaiting confirmation) ─ */
    {
      categoryId: electricalId, serviceName: 'Electrical Wiring Inspection',
      status: 'pending', scheduledAt: daysFromNow(7),
      price: 499, notes: 'Annual safety inspection for entire flat.',
    },
    {
      categoryId: salonId, serviceName: 'At-Home Salon Service',
      status: 'pending', scheduledAt: daysFromNow(10),
      price: 899, notes: 'Haircut and facial for 2 people.',
    },

    /* ─ IN_PROGRESS (currently active) ─ */
    {
      categoryId: cleaningId, serviceName: 'Kitchen Deep Clean',
      status: 'in_progress', scheduledAt: daysFromNow(0),
      price: 799, notes: 'Focus on chimney, stove top and cabinet interiors.',
    },

    /* ─ COMPLETED (past jobs, contribute to earnings) ─ */
    {
      categoryId: cleaningId, serviceName: 'Full Home Cleaning',
      status: 'completed', scheduledAt: daysFromNow(-1),
      price: 1199, notes: '2 BHK standard cleaning. Customer was very happy with results.',
    },
    {
      categoryId: plumbingId, serviceName: 'Pipe Leak Fix',
      status: 'completed', scheduledAt: daysFromNow(-2),
      price: 599, notes: 'Fixed 2 pipe leaks under kitchen sink.',
    },
    {
      categoryId: cleaningId, serviceName: 'Sofa & Carpet Cleaning',
      status: 'completed', scheduledAt: daysFromNow(-4),
      price: 1499, notes: '3-seater sofa + 2 carpets shampooed.',
    },
    {
      categoryId: electricalId, serviceName: 'Fan & Light Installation',
      status: 'completed', scheduledAt: daysFromNow(-6),
      price: 349, notes: 'Installed 2 ceiling fans and 4 LED panels.',
    },
    {
      categoryId: cleaningId, serviceName: 'Move-In Cleaning',
      status: 'completed', scheduledAt: daysFromNow(-8),
      price: 1799, notes: 'Complete sanitisation before moving in. 4 BHK unit.',
    },

    /* ─ CANCELLED ─ */
    {
      categoryId: salonId, serviceName: 'Bridal Makeup Package',
      status: 'cancelled', scheduledAt: daysFromNow(-3),
      price: 3999, notes: 'Customer cancelled due to venue change.',
    },
  ];

  for (const job of jobs) {
    await sql`
      INSERT INTO bookings
        (customer_id, professional_id, category_id, address_id, service_name, pro_name, scheduled_at, status, notes, price)
      VALUES (
        ${custUser.id},
        ${proId},
        ${job.categoryId},
        ${addrId},
        ${job.serviceName},
        'Ravi Kumar',
        ${job.scheduledAt.toISOString()},
        ${job.status},
        ${job.notes},
        ${job.price}
      )
    `;
    console.log(`  ✓ [${job.status.toUpperCase().padEnd(11)}] ${job.serviceName} — ₹${job.price}`);
  }

  /* ── 8. Summary ── */
  const summary = await sql`
    SELECT status, COUNT(*) AS cnt, SUM(price) AS total
    FROM bookings
    WHERE professional_id = ${proId}
    GROUP BY status
    ORDER BY status
  `;

  console.log('\n══════════════════════════════════════════');
  console.log('  Seed Complete — Summary');
  console.log('══════════════════════════════════════════');
  console.log('\n📊 Bookings by status:');
  for (const row of summary) {
    console.log(`  ${row.status.padEnd(12)} ${row.cnt} job(s)  ₹${row.total}`);
  }

  const earningsRows = await sql`
    SELECT SUM(price) AS total FROM bookings
    WHERE professional_id = ${proId} AND status = 'completed'
  `;
  console.log(`\n💰 Total earnings (completed): ₹${earningsRows[0].total}`);

  console.log('\n🔑 Partner Login:');
  console.log('   Email:    partner@servenow.com');
  console.log('   Password: Partner@123');
  console.log('\n🔑 Customer Login:');
  console.log('   Email:    customer@servenow.com');
  console.log('   Password: Customer@123');

  await sql.end();
  console.log('\n[seed-partner] Done ✓\n');
}

main().catch(err => {
  console.error('[seed-partner] Failed:', err.message ?? err);
  process.exit(1);
});
