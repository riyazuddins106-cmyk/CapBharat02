import { db } from '../config/database.js';
import { notifications, users } from '../database/schema/index.js';
import { eq } from 'drizzle-orm';

async function main() {
  const [admin] = await db.select().from(users).where(eq(users.email, 'admin@servenow.in')).limit(1);
  if (!admin) {
    console.error('Admin user not found');
    process.exit(1);
  }

  const dummy = [
    { title: 'New booking request', body: 'Ravi Kumar requested a plumbing service for tomorrow at 10:00 AM.', type: 'booking', isRead: false },
    { title: 'Payment received', body: 'Payment of ₹1,250 was received for booking #BK-10234.', type: 'payment', isRead: false },
    { title: 'New professional signup', body: 'Anita Sharma applied to join as an Electrician.', type: 'professional', isRead: false },
    { title: 'Review submitted', body: 'A customer left a 5-star review for Suresh Yadav.', type: 'review', isRead: true },
    { title: 'Support ticket opened', body: 'Ticket #ST-552 was opened: "Refund not processed".', type: 'support', isRead: false },
    { title: 'System maintenance', body: 'Scheduled maintenance completed successfully at 2:00 AM.', type: 'system', isRead: true },
  ];

  for (const n of dummy) {
    await db.insert(notifications).values({ ...n, userId: admin.id });
  }

  console.log(`Seeded ${dummy.length} notifications for admin ${admin.email}`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
