import { AppError } from '../utils/AppError.js';
import { supabaseAdmin, AVATAR_BUCKET } from '../config/supabase.js';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const storageService = {
  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw AppError.badRequest('Avatar must be a PNG, JPEG, or WebP image.');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw AppError.badRequest('Avatar must be smaller than 5MB.');
    }

    const extension = file.originalname.split('.').pop() || 'jpg';
    const path = `${userId}/avatar-${Date.now()}.${extension}`;

    const { error } = await supabaseAdmin.storage.from(AVATAR_BUCKET).upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

    if (error) {
      throw AppError.internal(`Failed to upload avatar: ${error.message}`);
    }

    const { data } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },
};
