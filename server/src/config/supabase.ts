import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

export const AVATAR_BUCKET    = 'avatars';
export const CATEGORY_BUCKET  = 'categories';
export const REELS_BUCKET     = 'reels';

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
  }
}

export async function ensureAvatarBucket() {
  await ensureBucket(AVATAR_BUCKET,   ['image/png', 'image/jpeg', 'image/webp']);
  await ensureBucket(CATEGORY_BUCKET, ['image/png', 'image/jpeg', 'image/webp']);
  await ensureBucket(REELS_BUCKET,    ['video/mp4', 'video/quicktime', 'video/webm', 'image/png', 'image/jpeg', 'image/webp']);
}
