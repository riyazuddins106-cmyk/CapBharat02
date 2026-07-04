import { eq, asc } from 'drizzle-orm';
import { db } from '../config/database.js';
import { serviceCategories, type ServiceCategory, type NewServiceCategory } from '../database/schema/serviceCategories.js';

export const categoryRepository = {
  async findAll(): Promise<ServiceCategory[]> {
    return db.select().from(serviceCategories).where(eq(serviceCategories.isActive, true)).orderBy(asc(serviceCategories.sortOrder));
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
