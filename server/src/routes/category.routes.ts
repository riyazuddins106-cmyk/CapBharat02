import { Router } from 'express';
import { categoryController } from '../controllers/category.controller.js';

const router = Router();

router.get('/', categoryController.list);
router.get('/:id', categoryController.getById);

export default router;
