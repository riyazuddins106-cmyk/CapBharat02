import { Router } from 'express';
import multer from 'multer';
import { profileController } from '../controllers/profile.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/profile.validators.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.use(authenticate);
router.get('/me', profileController.getProfile);
router.patch('/me', validate({ body: updateProfileSchema }), profileController.updateProfile);
router.post('/me/avatar', upload.single('avatar'), profileController.uploadAvatar);

export default router;
