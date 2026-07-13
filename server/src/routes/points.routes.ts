import { Router } from 'express';
import { pointsController } from '../controllers/points.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { redeemPointsSchema } from '../validators/points.validators.js';

const router = Router();

router.use(authenticate);
router.get('/', pointsController.getSummary);
router.post('/redeem', validate({ body: redeemPointsSchema }), pointsController.redeem);

export default router;
