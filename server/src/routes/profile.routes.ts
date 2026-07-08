import { Router } from 'express';
import multer from 'multer';
import { profileController } from '../controllers/profile.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/profile.validators.js';

const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Only PNG, JPEG, or WebP images are allowed'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.use(authenticate);
router.get('/me', profileController.getProfile);
router.patch('/me', validate({ body: updateProfileSchema }), profileController.updateProfile);
router.post('/me/avatar', upload.single('avatar'), profileController.uploadAvatar);
router.patch('/me/push-token', profileController.registerPushToken);

export default router;
