import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

export const AVATAR_BUCKET    = 'avatars';
export const CATEGORY_BUCKET  = 'categories';
export const REELS_BUCKET     = 'reels';
export const BANNER_BUCKET    = 'banners';

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function ensureBucket(name: string, mimeTypes: string[], sizeLimit = '5MB') {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) { console.error(`[storage] Failed to list buckets:`, listError.message); return; }
  if (!buckets?.some((b) => b.name === name)) {
    const { error } = await supabaseAdmin.storage.createBucket(name, { public: true, fileSizeLimit: sizeLimit, allowedMimeTypes: mimeTypes });
    if (error) console.error(`[storage] Failed to create "${name}" bucket:`, error.message);
    else console.log(`[storage] Created "${name}" bucket`);
  } else {
    // Update allowed MIME types on the existing bucket so SVG support is picked up
    const { error } = await supabaseAdmin.storage.updateBucket(name, { public: true, fileSizeLimit: sizeLimit, allowedMimeTypes: mimeTypes });
    if (error) console.error(`[storage] Failed to update "${name}" bucket:`, error.message);
  }
}

export async function ensureAvatarBucket() {
  await ensureBucket(AVATAR_BUCKET,   ['image/png', 'image/jpeg', 'image/webp']);
  await ensureBucket(CATEGORY_BUCKET, ['image/svg+xml', 'image/webp', 'image/png', 'image/jpeg']);
  await ensureBucket(REELS_BUCKET,    ['video/mp4', 'video/quicktime', 'video/webm', 'image/png', 'image/jpeg', 'image/webp']);
  await ensureBucket(BANNER_BUCKET,   ['image/png', 'image/jpeg', 'image/webp']);
}
