import { eq, asc, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { serviceCategories, type ServiceCategory, type NewServiceCategory } from '../database/schema/serviceCategories.js';
import { services } from '../database/schema/services.js';

export const categoryRepository = {
  /** Always compute a live service count so the stored `service_count` column
   *  (which can drift from seeded / admin-managed data) is never stale. */
  async findAll(): Promise<ServiceCategory[]> {
    const rows = await db
      .select({
        id:          serviceCategories.id,
        name:        serviceCategories.name,
        description: serviceCategories.description,
        iconName:    serviceCategories.iconName,
        color:       serviceCategories.color,
        iconColor:   serviceCategories.iconColor,
        imageUrl:    serviceCategories.imageUrl,
        sortOrder:   serviceCategories.sortOrder,
        featured:    serviceCategories.featured,
        isActive:    serviceCategories.isActive,
        createdAt:   serviceCategories.createdAt,
        updatedAt:   serviceCategories.updatedAt,
        // Live count — overrides the stale stored column
        serviceCount: sql<number>`CAST(COUNT(CASE WHEN ${services.isActive} = true THEN 1 END) AS INTEGER)`,
      })
      .from(serviceCategories)
      .leftJoin(services, eq(services.categoryId, serviceCategories.id))
      .where(eq(serviceCategories.isActive, true))
      .groupBy(serviceCategories.id)
      .orderBy(asc(serviceCategories.sortOrder));
    return rows as unknown as ServiceCategory[];
  },

  async findById(id: string): Promise<ServiceCategory | undefined> {
    const [cat] = await db.select().from(serviceCategories).where(eq(serviceCategories.id, id)).limit(1);
    return cat;
  },

  async create(data: NewServiceCategory): Promise<ServiceCategory> {
    const [cat] = await db.insert(serviceCategories).values(data).returning();
    return cat;
  },

  async update(id: string, data: Partial<NewServiceCategory>): Promise<ServiceCategory | undefined> {
    const [cat] = await db.update(serviceCategories).set({ ...data, updatedAt: new Date() }).where(eq(serviceCategories.id, id)).returning();
    return cat;
  },

  async exists(name: string): Promise<boolean> {
    const [cat] = await db.select({ id: serviceCategories.id }).from(serviceCategories).where(eq(serviceCategories.name, name)).limit(1);
    return Boolean(cat);
  },
};
