import { AppError } from '../utils/AppError.js';
import { userRepository } from '../repositories/user.repository.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import type { IdentityField, UpdateProfileInput } from '../validators/profile.validators.js';
import { otpService } from './otp.service.js';
import { db } from '../config/database.js';
import { users } from '../database/schema/users.js';
import { and, eq, isNull, ne } from 'drizzle-orm';

function normalizeIdentity(field: IdentityField, value: string): string {
  return field === 'email'
    ? value.trim().toLowerCase()
    : value.trim().replace(/[^\d+]/g, '');
}

export const userService = {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found.');
    }
    return {
      id: user.id,
      username: user.username,
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
    const user = await userRepository.update(userId, {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
    });
    if (!user) {
      throw AppError.notFound('User not found.');
    }
    return this.getProfile(userId);
  },

  async requestIdentityChange(userId: string, field: IdentityField, value: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found.');

    const target = normalizeIdentity(field, value);
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      throw AppError.badRequest('Enter a valid email address.');
    }
    if (field === 'phone' && (target.length < 7 || target.length > 20)) {
      throw AppError.badRequest('Enter a valid mobile number.');
    }
    if (target === (field === 'email' ? user.email : user.phone)) {
      throw AppError.badRequest(`That ${field} is already on your account.`);
    }

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        field === 'email' ? eq(users.email, target) : eq(users.phone, target),
        ne(users.id, userId),
        isNull(users.deletedAt),
      ))
      .limit(1);
    if (existing) throw AppError.conflict(`That ${field} is already in use.`);

    const devCode = await otpService.issueIdentity(user.id, user.email, field, target);
    return {
      field,
      target,
      expiresInMinutes: 10,
      ...(process.env.NODE_ENV !== 'production' ? { devCode } : {}),
    };
  },

  async verifyIdentityChange(userId: string, field: IdentityField, value: string, code: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found.');
    const target = normalizeIdentity(field, value);
    await otpService.verifyIdentity(userId, field, target, code);

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        field === 'email' ? eq(users.email, target) : eq(users.phone, target),
        ne(users.id, userId),
        isNull(users.deletedAt),
      ))
      .limit(1);
    if (existing) throw AppError.conflict(`That ${field} is already in use.`);

    const updated = await userRepository.update(userId, field === 'email'
      ? { email: target, emailVerifiedAt: new Date() }
      : { phone: target, phoneVerifiedAt: new Date() });
    if (!updated) throw AppError.notFound('User not found.');
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
