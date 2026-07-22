import { Router } from 'express';
import multer from 'multer';
import { profileController } from '../controllers/profile.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema, changePasswordSchema } from '../validators/profile.validators.js';

// Only enforce the size limit here. MIME type is client-supplied and can be
// spoofed, so real image-type validation is done via magic bytes in
// storageService.uploadAvatar — that is the single authoritative gate.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.use(authenticate);
router.get('/me', profileController.getProfile);
router.patch('/me', validate({ body: updateProfileSchema }), profileController.updateProfile);
router.post('/me/avatar', upload.single('avatar'), profileController.uploadAvatar);
router.post('/me/change-password', validate({ body: changePasswordSchema }), profileController.changePassword);
router.patch('/me/push-token', profileController.registerPushToken);
router.delete('/me', profileController.deleteAccount);

export default router;
