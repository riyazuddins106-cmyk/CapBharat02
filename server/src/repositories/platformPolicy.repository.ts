import { db } from '../config/database.js';
import { platformPolicies, type PlatformPolicy } from '../database/schema/index.js';
import { eq, asc, isNull, isNotNull } from 'drizzle-orm';

export const platformPolicyRepository = {
  async getAll(): Promise<PlatformPolicy[]> {
    return db.select().from(platformPolicies)
      .where(isNull(platformPolicies.deletedAt))
      .orderBy(asc(platformPolicies.slug));
  },

  async getBySlug(slug: string): Promise<PlatformPolicy | undefined> {
    const [row] = await db.select().from(platformPolicies)
      .where(eq(platformPolicies.slug, slug));
    return row;
  },

  async upsert(slug: string, title: string, content: string): Promise<PlatformPolicy> {
    const [row] = await db
      .insert(platformPolicies)
      .values({ slug, title, content, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: platformPolicies.slug,
        set: { title, content, updatedAt: new Date() },
      })
      .returning();
    return row;
  },

  async create(slug: string, title: string, content: string): Promise<PlatformPolicy> {
    const [row] = await db
      .insert(platformPolicies)
      .values({ slug, title, content, updatedAt: new Date() })
      .returning();
    return row;
  },

  async remove(slug: string): Promise<PlatformPolicy | undefined> {
    const [row] = await db
      .update(platformPolicies)
      .set({ deletedAt: new Date() })
      .where(eq(platformPolicies.slug, slug))
      .returning();
    return row;
  },

  async restore(slug: string): Promise<PlatformPolicy | undefined> {
    const [row] = await db
      .update(platformPolicies)
      .set({ deletedAt: null })
      .where(eq(platformPolicies.slug, slug))
      .returning();
    return row;
  },

  async getDeleted(): Promise<PlatformPolicy[]> {
    return db.select().from(platformPolicies)
      .where(isNotNull(platformPolicies.deletedAt))
      .orderBy(asc(platformPolicies.slug));
  },
};
