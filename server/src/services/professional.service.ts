import { AppError } from '../utils/AppError.js';
import { professionalRepository, type ProfessionalFilters } from '../repositories/professional.repository.js';
import { reviewRepository } from '../repositories/review.repository.js';
import { favoriteRepository } from '../repositories/favorite.repository.js';

export const professionalService = {
  async list(filters: ProfessionalFilters, customerId?: string) {
    const { data, total } = await professionalRepository.findAll(filters);

    let favSet = new Set<string>();
    if (customerId) {
      const favs = await favoriteRepository.listForCustomer(customerId);
      favSet = new Set(favs.map((f) => f.professionalId));
    }

    return {
      data: data.map((p) => ({ ...p, isFavorite: favSet.has(p.id) })),
      total,
      limit: filters.limit ?? 20,
      offset: filters.offset ?? 0,
    };
  },

  async getById(id: string, customerId?: string) {
    const pro = await professionalRepository.findById(id);
    if (!pro) throw AppError.notFound('Professional not found.');

    const [reviewList, isFavorite] = await Promise.all([
      reviewRepository.listForProfessional(id),
      customerId ? favoriteRepository.isProfessionalFavorited(customerId, id) : Promise.resolve(false),
    ]);

    return { ...pro, reviews: reviewList, isFavorite };
  },
};
