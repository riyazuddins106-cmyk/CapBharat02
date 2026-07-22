import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { dispatchController } from '../controllers/dispatch.controller.js';

const router = Router();
router.use(authenticate, requireRole('admin', 'operations_manager'));
router.get('/', dispatchController.list);
router.get('/history', dispatchController.history);
router.get('/:bookingId/eligible-partners', dispatchController.eligible);
router.post('/:bookingId/assign', dispatchController.assign);
export default router;