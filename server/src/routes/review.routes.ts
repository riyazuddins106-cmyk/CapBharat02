import { Router } from 'express';
import { reviewController } from '../controllers/review.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { createReviewSchema } from '../validators/review.validators.js';

const router = Router();

router.post('/', authenticate, validate({ body: createReviewSchema }), reviewController.create);

export default router;
