import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { serviceWishlistController } from '../controllers/serviceWishlist.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', serviceWishlistController.list);
router.get('/ids', serviceWishlistController.ids);
router.post('/:serviceId', serviceWishlistController.toggle);

export default router;
