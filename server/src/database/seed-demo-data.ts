/**
 * Seed realistic test data for manual testing:
 *   - Addresses (customer)
 *   - Favorites / Wishlist (customer → professionals)
 *   - Notifications (customer)
 *   - Support Tickets (customer + partner)
 *
 * Run with:
 *   pnpm --filter @servenow/server exec tsx src/database/seed-demo-data.ts
 */
import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.SUPABASE_DATABASE_URL;
if (!url) throw new Error('SUPABASE_DATABASE_URL is not set');

const sql = postgres(url, { ssl: 'require', max: 1 });

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  ServeNow — Demo Data Seeder');
  console.log('══════════════════════════════════════════\n');

  // ── Get user IDs ────────────────────────────────────────
  const [customer] = await sql`SELECT id FROM users WHERE email = 'customer@servenow.in'`;
  const [partner]  = await sql`SELECT id FROM users WHERE email = 'partner@servenow.in'`;

  if (!customer) { console.error('❌ customer@servenow.in not found. Run seed-test-accounts.ts first.'); process.exit(1); }

  const customerId = customer.id as string;
  const partnerId  = partner?.id as string | undefined;

  console.log('Customer ID:', customerId);
  if (partnerId) console.log('Partner ID:', partnerId);

  // ── Get professional IDs ─────────────────────────────────
  const professionals = await sql`SELECT id, name FROM professionals LIMIT 6`;
  console.log(`Found ${professionals.length} professional(s) for wishlist seeding`);

  // ── 1. Addresses ────────────────────────────────────────
  const existingAddresses = await sql`SELECT COUNT(*) AS c FROM addresses WHERE user_id = ${customerId}`;
  if (Number(existingAddresses[0].c) === 0) {
    await sql`
      INSERT INTO addresses (user_id, label, line1, line2, city, state, postal_code, country, is_default)
      VALUES
        (${customerId}, 'Home',   '12, MG Road, Indiranagar', 'Near Metro Station',    'Bangalore', 'Karnataka', '560038', 'India', true),
        (${customerId}, 'Office', '4th Floor, Prestige Tower',  '100 Feet Road, Koramangala', 'Bangalore', 'Karnataka', '560034', 'India', false),
        (${customerId}, 'Mom''s', '7, Gandhi Nagar, Andheri',   'Opp. Railway Station',        'Mumbai',    'Maharashtra', '400058', 'India', false)
    `;
    console.log('✓ Seeded 3 addresses (Home, Office, Mom\'s)');
  } else {
    console.log('– Addresses already exist, skipping');
  }

  // ── 2. Favorites / Wishlist ──────────────────────────────
  if (professionals.length > 0) {
    const existingFavs = await sql`SELECT COUNT(*) AS c FROM favorites WHERE customer_id = ${customerId}`;
    if (Number(existingFavs[0].c) === 0) {
      for (const pro of professionals.slice(0, Math.min(4, professionals.length))) {
        await sql`
          INSERT INTO favorites (customer_id, professional_id)
          VALUES (${customerId}, ${pro.id})
          ON CONFLICT DO NOTHING
        `;
      }
      console.log(`✓ Seeded ${Math.min(4, professionals.length)} wishlist item(s) from professionals`);
    } else {
      console.log('– Favorites already exist, skipping');
    }
  } else {
    console.log('– No professionals found; run seed-demo.ts to add professionals first');
  }

  // ── 3. Notifications ────────────────────────────────────
  const existingNotifs = await sql`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ${customerId}`;
  if (Number(existingNotifs[0].c) === 0) {
    await sql`
      INSERT INTO notifications (user_id, title, body, type, is_read)
      VALUES
        (${customerId}, 'Booking Confirmed! 🎉',          'Your AC Service booking on 15 Jul has been confirmed. Raj Kumar will arrive at 10 AM.',      'booking',  false),
        (${customerId}, 'Partner On The Way 🚗',           'Your partner Amit Singh is 10 minutes away. Please be ready at the door.',                   'booking',  false),
        (${customerId}, 'Job Completed ✅',                'Your Plumbing service has been completed. Rate your experience to help others.',              'booking',  true),
        (${customerId}, 'New Offer — 20% Off Cleaning 🧹', 'Limited time offer! Book any cleaning service this week and get 20% off. Use code CLEAN20.', 'promo',    false),
        (${customerId}, 'ServeNow Tip 💡',                 'Did you know? You can save multiple addresses to make booking faster. Try it now!',           'system',   true),
        (${customerId}, 'Review Reminder ⭐',               'How was your experience with Raj Kumar? Your review helps our community.',                    'review',   false)
    `;
    console.log('✓ Seeded 6 notifications (4 unread, 2 read)');
  } else {
    console.log('– Notifications already exist, skipping');
  }

  // Partner notifications
  if (partnerId) {
    const existingPartnerNotifs = await sql`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ${partnerId}`;
    if (Number(existingPartnerNotifs[0].c) === 0) {
      await sql`
        INSERT INTO notifications (user_id, title, body, type, is_read)
        VALUES
          (${partnerId}, 'New Job Assigned 📋',        'You have a new Plumbing job on 16 Jul at 11 AM in Indiranagar. Check your job board.',      'booking', false),
          (${partnerId}, 'Payout Processed 💰',         'Your payout of ₹3,200 has been processed. Amount will reflect in 2–3 business days.',       'payment', false),
          (${partnerId}, 'Great Review! ⭐',             'Customer Priya Sharma gave you 5 stars: "Excellent work, very professional!"',               'review',  true),
          (${partnerId}, 'Profile Tip 💡',              'Complete your profile bio and add skills to attract more customers.',                         'system',  true)
      `;
      console.log('✓ Seeded 4 partner notifications');
    } else {
      console.log('– Partner notifications already exist, skipping');
    }
  }

  // ── 4. Support Tickets ───────────────────────────────────
  const existingTickets = await sql`SELECT COUNT(*) AS c FROM support_tickets`;
  if (Number(existingTickets[0].c) === 0) {
    await sql`
      INSERT INTO support_tickets (user_id, name, email, subject, message, status, response)
      VALUES
        (
          ${customerId},
          'Test Customer',
          'customer@servenow.in',
          'Partner arrived late by 2 hours',
          'I booked an AC service for 10 AM but the partner arrived at 12 PM without any notification. This is unacceptable. Please improve punctuality.',
          'in_progress',
          'We sincerely apologize for the inconvenience. We have noted this feedback and will follow up with the partner. You will receive a ₹100 credit for the delay.'
        ),
        (
          ${customerId},
          'Test Customer',
          'customer@servenow.in',
          'App not showing my past bookings',
          'The Bookings tab is empty even though I have made 3 bookings in the past month. Please fix this bug.',
          'open',
          NULL
        ),
        (
          ${partnerId ?? customerId},
          'Test Partner',
          'partner@servenow.in',
          'Payout not received for last month',
          'My payout of ₹5,400 for June was supposed to be processed on the 5th but I still have not received it. Please check.',
          'closed',
          'Hi, we have verified the payout and it has been processed on 7th July. Please allow 1-2 business days for your bank to reflect the amount. Thank you!'
        ),
        (
          NULL,
          'New User',
          'newuser@example.com',
          'How do I cancel a booking?',
          'I accidentally booked the wrong service. How do I cancel it? Is there a cancellation fee?',
          'open',
          NULL
        )
    `;
    console.log('✓ Seeded 4 support tickets (1 in_progress with response, 1 closed, 2 open)');
  } else {
    console.log('– Support tickets already exist, skipping');
  }

  console.log('\n══════════════════════════════════════════');
  console.log('  ✅ Demo data seeding complete!');
  console.log('══════════════════════════════════════════\n');

  console.log('Test these in the apps:');
  console.log('  Customer → Profile → Notifications   : 6 notifications (4 unread)');
  console.log('  Customer → Profile → Saved Addresses : 3 addresses (Home, Office, Mom\'s)');
  console.log('  Customer → Profile → Wishlist        : up to 4 professionals saved');
  console.log('  Admin    → Help & Support            : 4 support tickets with statuses');

  await sql.end();
}

main().catch((err) => {
  console.error('\n❌ Seeding failed:', err.message ?? err);
  process.exit(1);
});
