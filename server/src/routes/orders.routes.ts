import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { ordersController } from '../controllers/orders.controller.js';
import {
  createRazorpayOrderForItem,
  verifyRazorpayForItem,
  createStripeSessionForItem,
} from '../controllers/payment.controller.js';

const router = Router();

router.use(authenticate, requireRole('customer', 'admin'));

// Master order operations
router.post('/checkout',   ordersController.checkout);
router.get('/',            ordersController.list);
router.get('/:id',         ordersController.getById);

// Per-service item operations
router.get('/:id/items/:itemId/qr',                    ordersController.getItemQr);
router.patch('/:id/items/:itemId/cancel',            ordersController.cancelItem);
router.patch('/:id/items/:itemId/continue-searching', ordersController.continueSearching);

// Per-service item payments
router.get('/:id/items/:itemId/payment',   ordersController.getItemPayment);
router.post('/:id/items/:itemId/pay',      ordersController.payItem);
router.post('/:id/items/:itemId/test-pay', ordersController.testPayItem);
router.post('/:id/items/:itemId/razorpay/create-order', createRazorpayOrderForItem);
router.post('/:id/items/:itemId/razorpay/verify', verifyRazorpayForItem);
router.post('/:id/items/:itemId/stripe/create-session', createStripeSessionForItem);

export default router;
