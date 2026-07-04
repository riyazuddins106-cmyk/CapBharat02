import { categoryRepository } from '../repositories/category.repository.js';

export const categoryService = {
  async list() {
    return categoryRepository.findAll();
  },

  async getById(id: string) {
    return categoryRepository.findById(id);
  },
};
