import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.SUPABASE_DATABASE_URL;
if (!url) throw new Error('SUPABASE_DATABASE_URL not set');
const sql = postgres(url, { ssl: 'require', max: 1 });

async function main() {
  const [customer] = await sql`SELECT id FROM users WHERE email = 'customer@servenow.in'`;
  const [partner]  = await sql`SELECT id FROM users WHERE email = 'partner@servenow.in'`;
  if (!customer) throw new Error('Run seed-test-accounts.ts first');

  const cId = customer.id as string;
  const pId = (partner?.id ?? cId) as string;

  // ── Clear test junk ──────────────────────────────────────
  await sql`DELETE FROM support_tickets WHERE subject IN ('Help!','Test Ticket','Help needed','Test') OR name = 'Test'`;
  await sql`DELETE FROM favorites WHERE customer_id = ${cId}`;
  console.log('Cleared test entries');

  // ── Wishlist: top-rated professionals ────────────────────
  const pros = await sql`SELECT id, name FROM professionals WHERE is_active = true ORDER BY rating DESC LIMIT 4`;
  for (const pro of pros) {
    await sql`INSERT INTO favorites (customer_id, professional_id) VALUES (${cId}, ${pro.id}) ON CONFLICT DO NOTHING`;
  }
  console.log(`Wishlist: added ${pros.length} items —`, pros.map((p: any) => p.name).join(', '));

  // ── Addresses ───────────────────────────────────────────
  const addrCount = await sql`SELECT COUNT(*) AS c FROM addresses WHERE user_id = ${cId}`;
  if (Number(addrCount[0].c) < 2) {
    await sql`
      INSERT INTO addresses (user_id, label, line1, line2, city, state, postal_code, country, is_default) VALUES
      (${cId}, 'Home',   '12, MG Road, Indiranagar',       'Near Metro Station',           'Bangalore', 'Karnataka',   '560038', 'India', true),
      (${cId}, 'Office', '4th Floor, Prestige Tower',       '100 Feet Road, Koramangala',   'Bangalore', 'Karnataka',   '560034', 'India', false),
      (${cId}, ${"Mom's"}, '7, Gandhi Nagar, Andheri',      'Opp. Railway Station',         'Mumbai',    'Maharashtra', '400058', 'India', false)
    `;
    console.log('Addresses: seeded 3 (Home, Office, Mom\'s)');
  } else {
    console.log(`Addresses: ${addrCount[0].c} already present`);
  }

  // ── Realistic Support Tickets ───────────────────────────
  await sql`
    INSERT INTO support_tickets (user_id, name, email, subject, message, status, response) VALUES
    (
      ${cId}, 'Rahul Verma', 'customer@servenow.in',
      'Partner arrived 2 hours late without any notice',
      'I booked an AC service for 10 AM but the partner arrived at 12 PM with no prior notification. I had to cancel an office meeting to wait. Please look into this.',
      'in_progress',
      'Hi Rahul, we sincerely apologize. We have spoken to the partner and added ₹150 credit to your account — it will apply automatically on your next booking.'
    ),
    (
      ${cId}, 'Rahul Verma', 'customer@servenow.in',
      'Bookings tab showing empty — past bookings missing',
      'The Bookings tab is completely empty even though I made 3 bookings last month. The 5 July booking is confirmed but not showing. Please fix.',
      'open',
      NULL
    ),
    (
      ${pId}, 'Rajan Verma', 'partner@servenow.in',
      'June payout of Rs 5400 not credited to bank',
      'My payout for June (Rs 5,400) was supposed to be processed on 5th July but has not arrived. My UPI ID is correct in my profile. Please check urgently.',
      'closed',
      'Hi Rajan, the payout was processed on 7th July. Allow 2-3 business days for bank credit. Reference: SN-PAY-20260707-4412. Contact your bank if not received by 12th July.'
    ),
    (
      NULL, 'Ananya Singh', 'ananya.singh@gmail.com',
      'How do I reschedule a confirmed booking?',
      'I have a cleaning service booked for tomorrow at 11 AM and need to change it to 3 PM. I cannot find a reschedule option in the app. Please help.',
      'open',
      NULL
    )
  `;
  console.log('Support tickets: seeded 4 realistic tickets');

  // ── Summary ─────────────────────────────────────────────
  const [a] = await sql`SELECT COUNT(*) AS c FROM addresses WHERE user_id = ${cId}`;
  const [f] = await sql`SELECT COUNT(*) AS c FROM favorites WHERE customer_id = ${cId}`;
  const [n] = await sql`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ${cId}`;
  const [t] = await sql`SELECT COUNT(*) AS c FROM support_tickets`;

  console.log('\n── Live counts ──');
  console.log('Addresses:       ', a.c);
  console.log('Wishlist items:  ', f.c);
  console.log('Notifications:   ', n.c);
  console.log('Support tickets: ', t.c);

  await sql.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
