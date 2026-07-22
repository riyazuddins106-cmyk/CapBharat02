import { Router } from 'express';
import { serviceController } from '../controllers/service.controller.js';

const router = Router();

// Public routes — no auth needed
router.get('/',    serviceController.list);
router.get('/:id', serviceController.getById);

export default router;
