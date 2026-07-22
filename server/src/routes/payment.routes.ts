import { Router } from 'express';
import {
  getPaymentConfig,
  serveRazorpayCheckout,
  razorpayCallback,
  razorpayWebhook,
  stripeSuccess,
  stripeWebhook,
} from '../controllers/payment.controller.js';

const router = Router();

// Public — payment config for the app
router.get('/config', getPaymentConfig);

// Razorpay — checkout HTML page (opened in mobile WebView)
router.get('/razorpay/checkout', serveRazorpayCheckout);

// Razorpay — callback from checkout.js form submission (signature verified here)
router.post('/razorpay/callback', razorpayCallback);

// Razorpay — async webhook (payment.captured etc.)
// Uses raw body for signature verification — registered before JSON middleware in app.ts
router.post('/razorpay/webhook', razorpayWebhook);

// Stripe — redirect after successful checkout session
router.get('/stripe/success', stripeSuccess);

// Stripe — async webhook
router.post('/stripe/webhook', stripeWebhook);

export default router;
