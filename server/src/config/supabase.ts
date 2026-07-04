import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

export const AVATAR_BUCKET = 'avatars';

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function ensureAvatarBucket() {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) {
    console.error('[storage] Failed to list buckets:', listError.message);
    return;
  }
  const exists = buckets?.some((b) => b.name === AVATAR_BUCKET);
  if (!exists) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(AVATAR_BUCKET, {
      public: true,
      fileSizeLimit: '5MB',
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    });
    if (createError) {
      console.error('[storage] Failed to create avatar bucket:', createError.message);
    } else {
      console.log(`[storage] Created "${AVATAR_BUCKET}" bucket`);
    }
  }
}
