import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

// In development the limits are relaxed so automated tests can run without
// hitting windows. Production values are enforced on deployment.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 500 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many attempts. Please try again later.' },
  },
});

export const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isDev ? 100 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many OTP requests. Please wait before trying again.' },
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isDev ? 1000 : 120,
  standardHeaders: true,
  legacyHeaders: false,
});

export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 500 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many requests. Please try again later.' },
  },
});
