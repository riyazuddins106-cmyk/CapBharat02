import { Router } from 'express';
import { reviewController } from '../controllers/review.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { createReviewSchema, updateReviewSchema, reviewIdParamSchema } from '../validators/review.validators.js';

const router = Router();

router.post('/', authenticate, validate({ body: createReviewSchema }), reviewController.create);
router.patch('/:id', authenticate, validate({ params: reviewIdParamSchema, body: updateReviewSchema }), reviewController.update);
router.delete('/:id', authenticate, validate({ params: reviewIdParamSchema }), reviewController.remove);

export default router;
