import { Router } from 'express';
import { supportTicketController } from '../controllers/supportTicket.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// Public (optional auth): create a support ticket
router.post('/', authenticate, supportTicketController.create);

// Authenticated: view own tickets
router.get('/mine', authenticate, supportTicketController.listMine);

// Admin only
router.get('/',        authenticate, requireRole('admin'), supportTicketController.listAll);
router.patch('/:id',   authenticate, requireRole('admin'), supportTicketController.updateStatus);

export default router;
