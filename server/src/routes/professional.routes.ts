import { Router } from 'express';
import { professionalController } from '../controllers/professional.controller.js';
import { optionalAuthenticate } from '../middleware/authenticate.js';
import { reviewController } from '../controllers/review.controller.js';

const router = Router();

// Public — optionally authenticated so isFavorite is populated for logged-in users
router.get('/', optionalAuthenticate, professionalController.list);
// NOTE: static routes must come before /:id to avoid "me" being treated as a UUID
router.get('/:id([0-9a-f-]{36})', optionalAuthenticate, professionalController.getById);
router.get('/:professionalId([0-9a-f-]{36})/reviews', reviewController.listForProfessional);

export default router;
