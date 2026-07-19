import { AppError } from '../utils/AppError.js';
import { supabaseAdmin, AVATAR_BUCKET, CATEGORY_BUCKET, REELS_BUCKET, BANNER_BUCKET } from '../config/supabase.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Detect the actual image type from the file's magic bytes / content.
 * Returns { mime, ext } if recognised, null otherwise.
 *
 * Signatures:
 *   SVG  — starts with '<svg' or '<?xml' (text-based, no binary magic)
 *   PNG  — 89 50 4E 47 0D 0A 1A 0A
 *   WebP — 52 49 46 46 ?? ?? ?? ?? 57 45 42 50  (RIFF....WEBP)
 *   JPEG — FF D8 FF  (legacy support — not advertised for categories)
 */
function detectImageType(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < 4) return null;

  // SVG — text-based; check the first 256 bytes for the characteristic tags
  const head = buf.slice(0, 256).toString('utf8').trimStart().toLowerCase();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) {
    // Confirm it's actually SVG (<?xml files might be other XML formats)
    if (head.startsWith('<svg') || head.includes('<svg')) {
      return { mime: 'image/svg+xml', ext: 'svg' };
    }
  }

  if (buf.length < 12) return null;

  // PNG
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return { mime: 'image/png', ext: 'png' };

  // WebP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return { mime: 'image/webp', ext: 'webp' };

  // JPEG (legacy — accepted but not advertised)
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return { mime: 'image/jpeg', ext: 'jpg' };

  return null;
}

export const storageService = {
  async uploadCategoryImage(key: string, file: Express.Multer.File): Promise<string> {
    if (file.size > MAX_FILE_SIZE) throw AppError.badRequest('Image must be smaller than 5MB.');
    const detected = detectImageType(file.buffer);
    if (!detected) throw AppError.badRequest('Image must be SVG, WebP, or PNG.');
    const path = `${key}-${Date.now()}.${detected.ext}`;
    const { error } = await supabaseAdmin.storage.from(CATEGORY_BUCKET).upload(path, file.buffer, { contentType: detected.mime, upsert: true });
    if (error) throw AppError.internal(`Upload failed: ${error.message}`);
    return supabaseAdmin.storage.from(CATEGORY_BUCKET).getPublicUrl(path).data.publicUrl;
  },

  async uploadReelVideo(key: string, file: Express.Multer.File): Promise<string> {
    const MAX_VIDEO = 100 * 1024 * 1024;
    if (file.size > MAX_VIDEO) throw AppError.badRequest('Video must be smaller than 100MB.');
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    const mime = file.mimetype;
    if (!allowed.includes(mime)) throw AppError.badRequest('Video must be MP4, MOV, or WebM.');
    const ext = mime === 'video/quicktime' ? 'mov' : mime === 'video/webm' ? 'webm' : 'mp4';
    const path = `${key}-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage.from(REELS_BUCKET).upload(path, file.buffer, { contentType: mime, upsert: true });
    if (error) throw AppError.internal(`Upload failed: ${error.message}`);
    return supabaseAdmin.storage.from(REELS_BUCKET).getPublicUrl(path).data.publicUrl;
  },

  async uploadBannerImage(key: string, file: Express.Multer.File): Promise<string> {
    if (file.size > MAX_FILE_SIZE) throw AppError.badRequest('Banner image must be smaller than 5MB.');
    const detected = detectImageType(file.buffer);
    if (!detected) throw AppError.badRequest('Banner image must be PNG, JPEG, or WebP.');
    const path = `${key}.${detected.ext}`;
    const { error } = await supabaseAdmin.storage.from(BANNER_BUCKET).upload(path, file.buffer, { contentType: detected.mime, upsert: true });
    if (error) throw AppError.internal(`Upload failed: ${error.message}`);
    return supabaseAdmin.storage.from(BANNER_BUCKET).getPublicUrl(path).data.publicUrl;
  },

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    if (file.size > MAX_FILE_SIZE) {
      throw AppError.badRequest('Avatar must be smaller than 5MB.');
    }

    // Validate actual file content via magic bytes — not the client-supplied
    // Content-Type header, which can be trivially spoofed.
    const detected = detectImageType(file.buffer);
    if (!detected) {
      throw AppError.badRequest('Avatar must be a PNG, JPEG, or WebP image.');
    }

    // Use the extension derived from magic bytes, never from originalname.
    const path = `${userId}/avatar-${Date.now()}.${detected.ext}`;

    const { error } = await supabaseAdmin.storage.from(AVATAR_BUCKET).upload(path, file.buffer, {
      contentType: detected.mime,   // use the magic-byte-verified type, not the client header
      upsert: true,
    });

    if (error) {
      throw AppError.internal(`Failed to upload avatar: ${error.message}`);
    }

    const { data } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },
};
