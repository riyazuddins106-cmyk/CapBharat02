import { Router } from 'express';
import { partnerController } from '../controllers/partner.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

router.use(authenticate, requireRole('partner', 'admin'));

router.get('/profile', partnerController.getProfile);
router.get('/jobs', partnerController.listJobs);
router.get('/jobs/:id', partnerController.getJob);
router.patch('/jobs/:id/checkin', partnerController.checkIn);
router.patch('/jobs/:id/complete', partnerController.completeJob);
router.get('/earnings', partnerController.getEarnings);
router.post('/payouts', partnerController.requestPayout);
router.get('/payouts', partnerController.listPayoutRequests);

export default router;
