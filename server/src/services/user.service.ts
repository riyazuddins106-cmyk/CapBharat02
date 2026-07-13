import { AppError } from '../utils/AppError.js';
import { userRepository } from '../repositories/user.repository.js';
import { comparePassword, hashPassword } from '../utils/password.js';
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

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found.');
    if (!user.passwordHash) throw AppError.badRequest('Password change not supported for this account.');
    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) throw AppError.badRequest('Current password is incorrect.');
    const passwordHash = await hashPassword(newPassword);
    await userRepository.update(userId, { passwordHash });
  },

  async deleteAccount(userId: string, password: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found.');
    if (!user.passwordHash) throw AppError.badRequest('Cannot delete this account type.');
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw AppError.badRequest('Incorrect password.');
    await userRepository.delete(userId);
  },

  async updatePushToken(userId: string, pushToken: string) {
    const user = await userRepository.update(userId, { pushToken });
    if (!user) {
      throw AppError.notFound('User not found.');
    }
  },
};
