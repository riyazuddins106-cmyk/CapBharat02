import { AppError } from '../utils/AppError.js';
import { favoriteRepository } from '../repositories/favorite.repository.js';
import { professionalRepository } from '../repositories/professional.repository.js';

export const favoriteService = {
  async list(customerId: string) {
    const favs = await favoriteRepository.listForCustomer(customerId);
    const proIds = favs.map((f) => f.professionalId);
    if (!proIds.length) return [];

    const pros = await Promise.all(proIds.map((id) => professionalRepository.findById(id)));
    return pros.filter(Boolean).map((p) => ({ ...p!, isFavorite: true }));
  },

  async toggle(customerId: string, professionalId: string) {
    const pro = await professionalRepository.findById(professionalId);
    if (!pro) throw AppError.notFound('Professional not found.');

    const existing = await favoriteRepository.find(customerId, professionalId);
    if (existing) {
      await favoriteRepository.delete(customerId, professionalId);
      return { isFavorite: false };
    }
    await favoriteRepository.create(customerId, professionalId);
    return { isFavorite: true };
  },
};
