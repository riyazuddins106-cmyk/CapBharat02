import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { serviceWishlistController } from '../controllers/serviceWishlist.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', serviceWishlistController.list);
router.get('/ids', serviceWishlistController.ids);
router.post('/:serviceId', serviceWishlistController.toggle);

export default router;
