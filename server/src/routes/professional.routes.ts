import { Router } from 'express';
import { professionalController } from '../controllers/professional.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { reviewController } from '../controllers/review.controller.js';

const router = Router();

// Public — optionally authenticated to include isFavorite
router.get('/', (req, res, next) => {
  // Try to attach user from token if present, but don't require it
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    authenticate(req, res, (err) => {
      if (err) return next(); // token invalid → still serve public data
      next();
    });
  } else {
    next();
  }
}, professionalController.list);

router.get('/:id', (req, res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    authenticate(req, res, (err) => {
      if (err) return next();
      next();
    });
  } else {
    next();
  }
}, professionalController.getById);

router.get('/:professionalId/reviews', reviewController.listForProfessional);

export default router;
