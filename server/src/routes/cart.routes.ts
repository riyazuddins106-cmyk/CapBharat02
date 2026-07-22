import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { cartController } from '../controllers/cart.controller.js';

const router = Router();
router.use(authenticate, requireRole('customer'));
router.get('/', cartController.get);
router.post('/items', cartController.add);
router.patch('/items/:itemId', cartController.update);
router.delete('/items/:itemId', cartController.remove);
export default router;