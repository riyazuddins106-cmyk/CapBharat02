import { Router } from 'express';
import { platformPolicyController } from '../controllers/platformPolicy.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// Public
router.get('/',      platformPolicyController.listAll);
router.get('/:slug', platformPolicyController.getOne);

export default router;
