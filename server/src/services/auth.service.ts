import { AppError } from '../utils/AppError.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, REFRESH_TOKEN_TTL_MS } from '../utils/jwt.js';
import { userRepository } from '../repositories/user.repository.js';
import { refreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { otpService } from './otp.service.js';
import bcrypt from 'bcryptjs';
import type { RegisterInput, RegisterPartnerInput, LoginInput, ResetPasswordInput } from '../validators/auth.validators.js';
import { professionalRepository } from '../repositories/professional.repository.js';
import { categoryRepository } from '../repositories/category.repository.js';
import type { User } from '../database/schema/users.js';
import { db } from '../config/database.js';
import { and, eq, isNull } from 'drizzle-orm';
import { partnerServices, services, subServiceCategories } from '../database/schema/index.js';

function toPublicUser(user: User) {
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
}

async function issueTokenPair(user: User) {
  const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });

  // Step 1: create a placeholder record to get a stable DB-generated ID
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const record = await refreshTokenRepository.create({
    userId: user.id,
    tokenHash: 'pending',
    expiresAt,
  });

  // Step 2: sign the JWT using that real ID
  const refreshToken = signRefreshToken({ userId: user.id, tokenId: record.id });

  // Step 3: hash the exact token we are returning, then update the record
  const tokenHash = await bcrypt.hash(refreshToken, 10);
  await refreshTokenRepository.updateHash(record.id, tokenHash);

  return { accessToken, refreshToken };
}

export const authService = {
  async registerPartner(input: RegisterPartnerInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('An account with this email already exists.');
    }

    // Validate category exists
    const category = await categoryRepository.findById(input.categoryId);
    if (!category) {
      throw AppError.notFound('Selected category not found.');
    }
    if (!category.isActive) {
      throw AppError.badRequest('Selected category is not active.');
    }

    const [subCategory] = await db.select({
      id: subServiceCategories.id,
      categoryId: subServiceCategories.categoryId,
      isActive: subServiceCategories.isActive,
    })
      .from(subServiceCategories)
      .where(eq(subServiceCategories.id, input.subCategoryId))
      .limit(1);
    if (!subCategory || !subCategory.isActive) {
      throw AppError.badRequest('Selected sub-category is not active.');
    }
    if (subCategory.categoryId !== input.categoryId) {
      throw AppError.badRequest('Selected sub-category does not belong to the selected category.');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({
      username: await userRepository.generateUsername(input.fullName, input.email),
      email: input.email,
      phone: input.phone,
      fullName: input.fullName,
      passwordHash,
      role: 'partner',
    });

    // Create a linked professional record so the partner can log in immediately
    const professional = await professionalRepository.create({
      userId: user.id,
      name: input.fullName,
      categoryId: input.categoryId,
      subCategoryId: input.subCategoryId,
      title: input.title,
      basePrice: 0,
      priceUnit: '/visit',
      city: input.city,
      area: input.area ?? null,
      pincode: input.pincode || null,
    });

    // A partner's selected sub-category is their initial service expertise.
    // Link all active catalog services in that sub-category so new partners
    // can receive matching jobs without creating or pricing catalog items.
    const matchingServices = await db.select({ id: services.id })
      .from(services)
      .where(and(
        eq(services.categoryId, input.categoryId),
        eq(services.subCategoryId, input.subCategoryId),
        eq(services.isActive, true),
        isNull(services.deletedAt),
      ));
    if (matchingServices.length) {
      await db.insert(partnerServices)
        .values(matchingServices.map((service) => ({
          partnerId: professional.id,
          serviceId: service.id,
        })))
        .onConflictDoNothing();
    }

    const code = await otpService.issue(user.email, 'signup', user.id, user.phone ?? undefined);
    return {
      userId: user.id,
      email: user.email,
      devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
      ...(await otpService.timing()),
    };
  },

  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      // A user row is created before signup OTP verification. If the client
      // was closed on the verification screen, allow the owner to resume the
      // pending signup instead of treating it as a permanent duplicate.
      if (!existing.emailVerifiedAt && existing.isActive) {
        const code = await otpService.resend(
          existing.email,
          'signup',
          existing.id,
          input.phone ?? existing.phone ?? undefined,
        );
        await userRepository.update(existing.id, {
          fullName: input.fullName,
          phone: input.phone ?? existing.phone,
          passwordHash: await hashPassword(input.password),
        });

        return {
          userId: existing.id,
          email: existing.email,
          resumed: true,
          devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
          ...(await otpService.timing()),
        };
      }
      throw AppError.conflict('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({
      username: await userRepository.generateUsername(input.fullName, input.email),
      email: input.email,
      phone: input.phone,
      fullName: input.fullName,
      passwordHash,
    });

    const code = await otpService.issue(user.email, 'signup', user.id, user.phone ?? undefined);

    return {
      userId: user.id,
      email: user.email,
      devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
      ...(await otpService.timing()),
    };
  },

  async verifySignupOtp(email: string, code: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw AppError.notFound('Account not found.');
    }

    await otpService.verify(email, 'signup', code);
    await userRepository.markEmailVerified(user.id);

    const refreshed = await userRepository.findById(user.id);
    const tokens = await issueTokenPair(refreshed!);

    return { user: toPublicUser(refreshed!), ...tokens };
  },

  async resendOtp(email: string, purpose: 'signup' | 'login' | 'password_reset') {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw AppError.notFound('Account not found.');
    }
    const code = await otpService.resend(email, purpose, user.id, user.phone ?? undefined);
    return {
      devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
      ...(await otpService.timing()),
    };
  },

  async login(input: LoginInput) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    const isValid = await comparePassword(input.password, user.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    if (!user.emailVerifiedAt) {
      await otpService.issue(user.email, 'signup', user.id, user.phone ?? undefined);
      throw AppError.forbidden('Email not verified. A new verification code has been sent.');
    }

    if (!user.isActive) {
      throw AppError.forbidden('This account has been disabled.');
    }

    const tokens = await issueTokenPair(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token.');
    }

    const stored = await refreshTokenRepository.findById(payload.tokenId);
    if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
      throw AppError.unauthorized('Refresh token is no longer valid.');
    }

    const matches = await bcrypt.compare(refreshToken, stored.tokenHash);
    if (!matches) {
      throw AppError.unauthorized('Refresh token is no longer valid.');
    }

    await refreshTokenRepository.revoke(stored.id);

    const user = await userRepository.findById(payload.userId);
    if (!user) {
      throw AppError.unauthorized('Account no longer exists.');
    }
    if (!user.isActive) {
      throw AppError.forbidden('This account has been disabled.');
    }

    const tokens = await issueTokenPair(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async logout(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await refreshTokenRepository.revoke(payload.tokenId);
    } catch {
      // Token already invalid/expired — logout is a no-op in that case.
    }
  },

  async logoutAll(userId: string) {
    await refreshTokenRepository.revokeAllForUser(userId);
  },

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Do not reveal whether the account exists.
      return {};
    }
    const code = await otpService.issue(email, 'password_reset', user.id, user.phone ?? undefined);
    return {
      devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
      ...(await otpService.timing()),
    };
  },

  async resetPassword(input: ResetPasswordInput) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw AppError.notFound('Account not found.');
    }

    await otpService.verify(input.email, 'password_reset', input.code);

    const passwordHash = await hashPassword(input.newPassword);
    await userRepository.update(user.id, { passwordHash });
    await refreshTokenRepository.revokeAllForUser(user.id);
  },

  toPublicUser,
};
