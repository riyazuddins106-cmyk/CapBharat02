import { db } from '../config/database.js';
import { notifications, users } from '../database/schema/index.js';
import { eq } from 'drizzle-orm';

async function main() {
  const email = process.argv[2] ?? 'customer_test@servenow.dev';
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u) { console.error(`User ${email} not found`); process.exit(1); }

  const dummy = [
    { title: 'Booking confirmed', body: 'Your plumbing service with Prakash Rao is confirmed for tomorrow 10:00 AM.', type: 'booking', isRead: false },
    { title: 'Professional on the way', body: 'Divya Nair is on the way to your address.', type: 'booking', isRead: false },
    { title: 'Payment successful', body: 'Your payment of ₹600 was successful.', type: 'payment', isRead: false },
    { title: 'Rate your service', body: 'How was your experience with Arun Bhatt? Tap to rate.', type: 'review', isRead: true },
    { title: 'Special offer', body: 'Flat 20% off on AC servicing this weekend!', type: 'promo', isRead: false },
  ];

  for (const n of dummy) {
    await db.insert(notifications).values({ ...n, userId: u.id });
  }
  console.log(`Seeded ${dummy.length} notifications for ${u.email}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
