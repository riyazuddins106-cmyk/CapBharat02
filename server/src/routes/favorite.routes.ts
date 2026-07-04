import { Router } from 'express';
import { favoriteController } from '../controllers/favorite.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

router.get('/', favoriteController.list);
router.post('/:professionalId', favoriteController.toggle);
router.delete('/:professionalId', favoriteController.toggle);

export default router;
