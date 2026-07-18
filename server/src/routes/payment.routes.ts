import { Router } from 'express';
import { getPaymentConfig } from '../controllers/payment.controller.js';

const router = Router();

// Public — no auth needed so the customer web/app can fetch config before login
router.get('/config', getPaymentConfig);

export default router;
