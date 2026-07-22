import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authRateLimiter, otpRateLimiter, refreshRateLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  registerSchema,
  registerPartnerSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validators.js';

const router = Router();

router.post('/register', authRateLimiter, validate({ body: registerSchema }), authController.register);
router.post('/register-partner', authRateLimiter, validate({ body: registerPartnerSchema }), authController.registerPartner);
router.post('/verify-otp', authRateLimiter, validate({ body: verifyOtpSchema }), authController.verifyOtp);
router.post('/resend-otp', otpRateLimiter, validate({ body: resendOtpSchema }), authController.resendOtp);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', refreshRateLimiter, validate({ body: refreshTokenSchema }), authController.refresh);
router.post('/logout', refreshRateLimiter, validate({ body: refreshTokenSchema }), authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.post('/forgot-password', otpRateLimiter, validate({ body: forgotPasswordSchema }), authController.forgotPassword);
router.post('/reset-password', authRateLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);

export default router;
