import { Router } from 'express';
import { professionalController } from '../controllers/professional.controller.js';
import { optionalAuthenticate } from '../middleware/authenticate.js';
import { reviewController } from '../controllers/review.controller.js';

const router = Router();

// Public — optionally authenticated so isFavorite is populated for logged-in users
router.get('/', optionalAuthenticate, professionalController.list);
router.get('/:id', optionalAuthenticate, professionalController.getById);
router.get('/:professionalId/reviews', reviewController.listForProfessional);

export default router;
