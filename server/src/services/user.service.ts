import { AppError } from '../utils/AppError.js';
import { userRepository } from '../repositories/user.repository.js';
import type { UpdateProfileInput } from '../validators/profile.validators.js';

export const userService = {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found.');
    }
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
      createdAt: user.createdAt,
    };
  },

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await userRepository.update(userId, input);
    if (!user) {
      throw AppError.notFound('User not found.');
    }
    return this.getProfile(userId);
  },

  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await userRepository.update(userId, { avatarUrl });
    if (!user) {
      throw AppError.notFound('User not found.');
    }
    return this.getProfile(userId);
  },
};
