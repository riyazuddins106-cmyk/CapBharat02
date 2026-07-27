import { AppError } from '../utils/AppError.js';
import { serviceWishlistRepository } from '../repositories/serviceWishlist.repository.js';
import { db } from '../config/database.js';
import { services } from '../database/schema/index.js';
import { eq, isNull } from 'drizzle-orm';

export const serviceWishlistService = {
  async list(customerId: string) {
    const serviceIds = await serviceWishlistRepository.getServiceIds(customerId);
    if (!serviceIds.length) return [];

    const rows = await db
      .select()
      .from(services)
      .where(isNull(services.deletedAt));

    return rows
      .filter((s) => serviceIds.includes(s.id))
      .map((s) => ({ ...s, isWishlisted: true }));
  },

  async toggle(customerId: string, serviceId: string) {
    const [service] = await db
      .select({ id: services.id })
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);

    if (!service) throw AppError.notFound('Service not found.');

    const existing = await serviceWishlistRepository.find(customerId, serviceId);
    if (existing) {
      await serviceWishlistRepository.delete(customerId, serviceId);
      return { isWishlisted: false };
    }
    await serviceWishlistRepository.create(customerId, serviceId);
    return { isWishlisted: true };
  },

  async getWishlistedIds(customerId: string): Promise<string[]> {
    return serviceWishlistRepository.getServiceIds(customerId);
  },
};
