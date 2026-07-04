/**
 * Seeds persistent demo data across all tables.
 * Run: pnpm --filter @servenow/server tsx src/database/seed-demo.ts
 */
import 'dotenv/config';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  ServeNow — Demo Data Seeder');
  console.log('══════════════════════════════════════════\n');

  /* ── 1. Categories ── */
  console.log('📂 Seeding service_categories…');
  await sql`
    INSERT INTO service_categories (name, icon_name, color, icon_color, service_count, sort_order)
    VALUES
      ('Cleaning',   'Sparkles',   '#EDE9FD', '#5B3EF5', 120, 1),
      ('Plumbing',   'Wrench',     '#FEF3C7', '#D97706', 85,  2),
      ('Electrical', 'Zap',        '#DCFCE7', '#16A34A', 94,  3),
      ('Salon',      'Scissors',   '#FCE7F3', '#DB2777', 200, 4),
      ('Painting',   'Paintbrush', '#DBEAFE', '#2563EB', 62,  5),
      ('AC Repair',  'Wind',       '#FFF7ED', '#EA580C', 78,  6),
      ('Laundry',    'Droplets',   '#F0FDF4', '#15803D', 55,  7),
      ('More',       'Grid',       '#F3F4F6', '#6B7280', 500, 8)
    ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
  `;
  const cats = await sql`SELECT id, name FROM service_categories ORDER BY sort_order`;
  console.log(`  ✅ ${cats.length} categories`);
  const catMap: Record<string, string> = {};
  cats.forEach((c: any) => { catMap[c.name] = c.id; });

  /* ── 2. Professionals ── */
  console.log('👷 Seeding professionals…');
  const proRows = [
    { categoryId: catMap['Cleaning'],   name: 'Priya Sharma',  title: 'Home Cleaning Expert',        bio: 'Certified deep cleaning specialist with 7+ years of experience.',        rating: 4.9, reviewCount: 312, basePrice: 399, priceUnit: '/visit',   badge: 'Top Rated', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop', tags: JSON.stringify(['Deep Clean','Sanitize']) },
    { categoryId: catMap['Electrical'], name: 'Rajan Verma',   title: 'Certified Electrician',        bio: 'Licensed electrician with expertise in wiring and fixtures.',             rating: 4.8, reviewCount: 189, basePrice: 249, priceUnit: '/hr',      badge: 'Verified',  avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop', tags: JSON.stringify(['Wiring','Fixtures']) },
    { categoryId: catMap['Salon'],      name: 'Meena Pillai',  title: 'Beauty & Salon Pro',           bio: 'Award-winning beauty professional specialising in hair and facials.',      rating: 4.9, reviewCount: 447, basePrice: 599, priceUnit: '/session', badge: 'Top Rated', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop', tags: JSON.stringify(['Hair','Facial']) },
    { categoryId: catMap['Plumbing'],   name: 'Suresh Kumar',  title: 'Master Plumber',               bio: 'Expert plumber handling leaks and pipe installations since 2010.',         rating: 4.7, reviewCount: 234, basePrice: 299, priceUnit: '/hr',      badge: 'Verified',  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop', tags: JSON.stringify(['Leaks','Pipes']) },
    { categoryId: catMap['Painting'],   name: 'Arjun Nair',    title: 'Interior Painting Specialist', bio: 'Professional painter specialising in interior and exterior work.',          rating: 4.6, reviewCount: 98,  basePrice: 349, priceUnit: '/day',     badge: null,        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop', tags: JSON.stringify(['Interior','Exterior']) },
    { categoryId: catMap['AC Repair'],  name: 'Deepak Joshi',  title: 'AC & HVAC Technician',         bio: 'Certified HVAC technician with experience in all major AC brands.',        rating: 4.8, reviewCount: 156, basePrice: 399, priceUnit: '/visit',   badge: 'Verified',  avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop', tags: JSON.stringify(['Repair','Service']) },
    { categoryId: catMap['Laundry'],    name: 'Kavya Reddy',   title: 'Laundry & Dry Clean Expert',   bio: 'Specialised in delicate fabric care and express laundry services.',        rating: 4.5, reviewCount: 87,  basePrice: 199, priceUnit: '/kg',      badge: null,        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop', tags: JSON.stringify(['Wash','Iron']) },
    { categoryId: catMap['Plumbing'],   name: 'Amit Singh',    title: 'Senior Plumbing Technician',   bio: 'Expert in bathroom renovations and waterproofing solutions.',              rating: 4.6, reviewCount: 143, basePrice: 349, priceUnit: '/hr',      badge: 'Verified',  avatarUrl: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&fit=crop', tags: JSON.stringify(['Renovation','Waterproofing']) },
  ];

  for (const p of proRows) {
    await sql`
      INSERT INTO professionals (category_id, name, title, bio, rating, review_count, base_price, price_unit, badge, avatar_url, tags)
      VALUES (${p.categoryId}, ${p.name}, ${p.title}, ${p.bio}, ${p.rating}, ${p.reviewCount}, ${p.basePrice}, ${p.priceUnit}, ${p.badge}, ${p.avatarUrl}, ${p.tags}::jsonb)
      ON CONFLICT DO NOTHING
    `;
  }
  const pros = await sql`SELECT id, name FROM professionals ORDER BY name`;
  console.log(`  ✅ ${pros.length} professionals`);
  const proMap: Record<string, string> = {};
  pros.forEach((p: any) => { proMap[p.name] = p.id; });

  /* ── 3. Users (3 demo customers) ── */
  console.log('👤 Seeding users…');
  const passwordHash = await bcrypt.hash('Demo@12345', 10);
  const demoUsers = [
    { email: 'arjun.mehta@demo.servenow', fullName: 'Arjun Mehta',   phone: '+919876543210' },
    { email: 'priya.kapoor@demo.servenow', fullName: 'Priya Kapoor', phone: '+919823456789' },
    { email: 'rahul.joshi@demo.servenow',  fullName: 'Rahul Joshi',  phone: '+919812345678' },
  ];
  for (const u of demoUsers) {
    await sql`
      INSERT INTO users (email, full_name, phone, password_hash, role, email_verified_at)
      VALUES (${u.email}, ${u.fullName}, ${u.phone}, ${passwordHash}, 'customer', NOW())
      ON CONFLICT (email) DO NOTHING
    `;
  }
  const users = await sql`SELECT id, email, full_name FROM users ORDER BY full_name`;
  console.log(`  ✅ ${users.length} users`);
  const userMap: Record<string, string> = {};
  users.forEach((u: any) => { userMap[u.email] = u.id; });

  const u1 = userMap['arjun.mehta@demo.servenow'];
  const u2 = userMap['priya.kapoor@demo.servenow'];
  const u3 = userMap['rahul.joshi@demo.servenow'];

  /* ── 4. Addresses ── */
  console.log('📍 Seeding addresses…');
  await sql`
    INSERT INTO addresses (user_id, label, line1, city, state, postal_code, country, is_default)
    VALUES
      (${u1}, 'Home',   '12 MG Road, Bandra West',      'Mumbai',    'Maharashtra', '400050', 'India', true),
      (${u1}, 'Office', '45 BKC Tower, Bandra Kurla',   'Mumbai',    'Maharashtra', '400051', 'India', false),
      (${u2}, 'Home',   '7 Indiranagar 100ft Road',     'Bengaluru', 'Karnataka',   '560038', 'India', true),
      (${u3}, 'Home',   '22 Rajouri Garden, Block B',   'New Delhi', 'Delhi',       '110027', 'India', true)
    ON CONFLICT DO NOTHING
  `;
  const addrs = await sql`SELECT id, user_id, label FROM addresses ORDER BY label`;
  console.log(`  ✅ ${addrs.length} addresses`);

  const addr1 = addrs.find((a: any) => a.user_id === u1 && a.label === 'Home')?.id;
  const addr2 = addrs.find((a: any) => a.user_id === u2 && a.label === 'Home')?.id;
  const addr3 = addrs.find((a: any) => a.user_id === u3 && a.label === 'Home')?.id;

  /* ── 5. Bookings ── */
  console.log('📅 Seeding bookings…');
  const priya = proMap['Priya Sharma'];
  const rajan = proMap['Rajan Verma'];
  const meena = proMap['Meena Pillai'];
  const suresh = proMap['Suresh Kumar'];
  const deepak = proMap['Deepak Joshi'];

  await sql`
    INSERT INTO bookings (customer_id, professional_id, category_id, address_id, service_name, pro_name, scheduled_at, status, price, notes)
    VALUES
      (${u1}, ${priya},  ${catMap['Cleaning']},   ${addr1}, 'Deep Home Cleaning',       'Priya Sharma',  NOW() + interval '1 day',   'upcoming',   399,  'Please bring eco-friendly cleaning products.'),
      (${u1}, ${rajan},  ${catMap['Electrical']}, ${addr1}, 'Wiring & Fixture Repair',  'Rajan Verma',   NOW() - interval '3 days',  'completed',  498,  'Fan and two light switches need fixing.'),
      (${u2}, ${meena},  ${catMap['Salon']},       ${addr2}, 'Hair & Facial Treatment',  'Meena Pillai',  NOW() + interval '2 days',  'upcoming',   599,  NULL),
      (${u2}, ${suresh}, ${catMap['Plumbing']},   ${addr2}, 'Pipe Leak Repair',         'Suresh Kumar',  NOW() - interval '7 days',  'completed',  299,  'Kitchen sink leak.'),
      (${u3}, ${deepak}, ${catMap['AC Repair']},  ${addr3}, 'AC Service & Gas Refill',  'Deepak Joshi',  NOW() - interval '1 day',   'completed',  399,  '1.5 ton split AC.'),
      (${u3}, ${priya},  ${catMap['Cleaning']},   ${addr3}, 'Bathroom Deep Clean',      'Priya Sharma',  NOW() + interval '3 days',  'upcoming',   299,  NULL),
      (${u1}, ${meena},  ${catMap['Salon']},       ${addr1}, 'Bridal Makeup Package',    'Meena Pillai',  NOW() - interval '14 days', 'completed',  1499, 'Wedding on Dec 15th.'),
      (${u2}, ${rajan},  ${catMap['Electrical']}, ${addr2}, 'Full Home Wiring Check',   'Rajan Verma',   NOW() - interval '2 days',  'cancelled',  498,  NULL)
    ON CONFLICT DO NOTHING
  `;
  const bookings = await sql`SELECT id, customer_id, status, service_name FROM bookings ORDER BY created_at DESC`;
  console.log(`  ✅ ${bookings.length} bookings`);

  /* ── 6. Reviews (for completed bookings) ── */
  console.log('⭐ Seeding reviews…');
  const completedBookings = bookings.filter((b: any) => b.status === 'completed');
  const reviewData = [
    { comment: 'Rajan was incredibly professional. Fixed everything in 30 mins!', rating: 5 },
    { comment: 'Suresh solved the leak quickly. Very thorough work.',              rating: 4 },
    { comment: 'Deepak serviced the AC perfectly. Highly recommend!',             rating: 5 },
    { comment: 'Meena is an artist. Looked stunning on my wedding day!',          rating: 5 },
  ];

  for (let i = 0; i < Math.min(completedBookings.length, reviewData.length); i++) {
    const b = completedBookings[i] as any;
    const rv = reviewData[i];
    const pro = await sql`SELECT professional_id FROM bookings WHERE id = ${b.id}`;
    await sql`
      INSERT INTO reviews (booking_id, customer_id, professional_id, rating, comment)
      VALUES (${b.id}, ${b.customer_id}, ${pro[0].professional_id}, ${rv.rating}, ${rv.comment})
      ON CONFLICT DO NOTHING
    `;
  }
  const reviews = await sql`SELECT id, rating FROM reviews`;
  console.log(`  ✅ ${reviews.length} reviews`);

  /* ── 7. Favorites ── */
  console.log('❤️  Seeding favorites…');
  await sql`
    INSERT INTO favorites (customer_id, professional_id)
    VALUES
      (${u1}, ${priya}),
      (${u1}, ${meena}),
      (${u2}, ${rajan}),
      (${u2}, ${suresh}),
      (${u3}, ${deepak}),
      (${u3}, ${priya})
    ON CONFLICT DO NOTHING
  `;
  const favs = await sql`SELECT id FROM favorites`;
  console.log(`  ✅ ${favs.length} favorites`);

  /* ── Final count ── */
  console.log('\n══════════════════════════════════════════');
  console.log('  📊 Database Summary');
  console.log('══════════════════════════════════════════');
  const summary = await sql`
    SELECT 'service_categories' AS tbl, COUNT(*)::int AS n FROM service_categories
    UNION ALL SELECT 'professionals', COUNT(*)::int FROM professionals
    UNION ALL SELECT 'users',         COUNT(*)::int FROM users
    UNION ALL SELECT 'addresses',     COUNT(*)::int FROM addresses
    UNION ALL SELECT 'bookings',      COUNT(*)::int FROM bookings
    UNION ALL SELECT 'reviews',       COUNT(*)::int FROM reviews
    UNION ALL SELECT 'favorites',     COUNT(*)::int FROM favorites
    ORDER BY tbl
  `;
  summary.forEach((r: any) => console.log(`  • ${r.tbl.padEnd(20)} ${r.n} rows`));

  await sql.end();
  console.log('\n  ✅ All demo data seeded successfully!\n');
}

main().catch((e) => { console.error('Seeder failed:', e.message); process.exit(1); });
