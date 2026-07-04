import { AppError } from '../utils/AppError.js';
import { addressRepository } from '../repositories/address.repository.js';
import type { CreateAddressInput, UpdateAddressInput } from '../validators/address.validators.js';

export const addressService = {
  async list(userId: string) {
    return addressRepository.listForUser(userId);
  },

  async create(userId: string, input: CreateAddressInput) {
    if (input.isDefault) {
      await addressRepository.clearDefault(userId);
    }
    return addressRepository.create({ ...input, userId });
  },

  async update(userId: string, id: string, input: UpdateAddressInput) {
    const existing = await addressRepository.findById(id, userId);
    if (!existing) {
      throw AppError.notFound('Address not found.');
    }
    if (input.isDefault) {
      await addressRepository.clearDefault(userId);
    }
    return addressRepository.update(id, userId, input);
  },

  async remove(userId: string, id: string) {
    const existing = await addressRepository.findById(id, userId);
    if (!existing) {
      throw AppError.notFound('Address not found.');
    }
    await addressRepository.softDelete(id, userId);
  },
};
