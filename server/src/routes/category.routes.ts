import { Router } from 'express';
import { categoryController } from '../controllers/category.controller.js';

const router = Router();

router.get('/', categoryController.list);
router.get('/:id', categoryController.getById);
router.get('/:id/subcategories', categoryController.listSubcategories);

export default router;
