import { db } from '../src/config/database.js';
import { users } from '../src/database/schema/index.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

const email = 'opsmanager@servenow.in';
const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

if (existing.length) {
  // Already exists — just promote to operations_manager
  await db.update(users).set({ role: 'operations_manager', emailVerified: true }).where(eq(users.email, email));
  console.log('promoted existing user to operations_manager:', existing[0].id);
} else {
  const hash = await bcrypt.hash('Ops@1234', 10);
  const [u] = await db.insert(users).values({
    email,
    passwordHash: hash,
    fullName: 'Ops Manager Test',
    phone: '+91 99999 00001',
    role: 'operations_manager' as any,
    emailVerified: true,
  }).returning({ id: users.id });
  console.log('created operations_manager user:', u.id);
}
process.exit(0);
