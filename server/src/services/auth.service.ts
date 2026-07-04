import { AppError } from '../utils/AppError.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, REFRESH_TOKEN_TTL_MS } from '../utils/jwt.js';
import { userRepository } from '../repositories/user.repository.js';
import { refreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { otpService } from './otp.service.js';
import bcrypt from 'bcryptjs';
import type { RegisterInput, LoginInput, ResetPasswordInput } from '../validators/auth.validators.js';
import type { User } from '../database/schema/users.js';

function toPublicUser(user: User) {
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
}

async function issueTokenPair(user: User) {
  const accessToken = signAccessToken({ userId: user.id, email: user.email });

  const refreshTokenRecord = await refreshTokenRepository.create({
    userId: user.id,
    tokenHash: 'pending',
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  const refreshToken = signRefreshToken({ userId: user.id, tokenId: refreshTokenRecord.id });
  const tokenHash = await bcrypt.hash(refreshToken, 10);
  await refreshTokenRepository.revoke(refreshTokenRecord.id);
  const updated = await refreshTokenRepository.create({
    userId: user.id,
    tokenHash,
    expiresAt: refreshTokenRecord.expiresAt,
  });

  return { accessToken, refreshToken: signRefreshToken({ userId: user.id, tokenId: updated.id }) };
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({
      email: input.email,
      phone: input.phone,
      fullName: input.fullName,
      passwordHash,
    });

    await otpService.issue(user.email, 'signup', user.id);

    return { userId: user.id, email: user.email };
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
    await otpService.issue(email, purpose, user.id);
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
      await otpService.issue(user.email, 'signup', user.id);
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

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Do not reveal whether the account exists.
      return;
    }
    await otpService.issue(email, 'password_reset', user.id);
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
