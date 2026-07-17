import { Router } from 'express';
import { reelController } from '../controllers/reel.controller.js';

const router = Router();
router.get('/',           reelController.listActive);
router.post('/:id/click', reelController.recordClick);
router.post('/:id/view',  reelController.recordView);

export default router;
