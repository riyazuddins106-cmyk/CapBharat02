import { Router } from 'express';
import { addressController } from '../controllers/address.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { createAddressSchema, updateAddressSchema, addressIdParamSchema } from '../validators/address.validators.js';

const router = Router();

router.use(authenticate);
router.get('/', addressController.list);
router.post('/', validate({ body: createAddressSchema }), addressController.create);
router.patch('/:id', validate({ params: addressIdParamSchema, body: updateAddressSchema }), addressController.update);
router.delete('/:id', validate({ params: addressIdParamSchema }), addressController.remove);

export default router;
