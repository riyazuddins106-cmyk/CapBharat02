import { Router } from 'express';
import { offerController } from '../controllers/offer.controller.js';

const router = Router();

// Public: mobile app fetches active offers
router.get('/', offerController.listActive);

export default router;
