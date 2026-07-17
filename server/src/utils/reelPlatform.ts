export type ReelPlatform = 'youtube' | 'youtube_shorts' | 'instagram' | 'facebook' | 'unknown';

const ALLOWED_HOSTS = new Set([
  'youtube.com', 'youtu.be', 'instagram.com', 'facebook.com', 'fb.watch',
]);

export function validateReelUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    return ALLOWED_HOSTS.has(host);
  } catch { return false; }
}

export function detectPlatform(url: string): ReelPlatform {
  try {
    const u   = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return 'youtube';
    if (host === 'youtube.com') {
      return u.pathname.startsWith('/shorts/') ? 'youtube_shorts' : 'youtube';
    }
    if (host === 'instagram.com') return 'instagram';
    if (host === 'facebook.com' || host === 'fb.watch') return 'facebook';
    return 'unknown';
  } catch { return 'unknown'; }
}

export function getYouTubeVideoId(url: string): string | null {
  try {
    const u    = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return u.pathname.slice(1).split('?')[0] || null;
    if (host === 'youtube.com') {
      if (u.pathname.startsWith('/shorts/')) {
        return u.pathname.split('/shorts/')[1]?.split(/[/?]/)[0] ?? null;
      }
      return u.searchParams.get('v');
    }
    return null;
  } catch { return null; }
}

export function getAutoThumbnail(url: string, platform: ReelPlatform): string | null {
  if (platform === 'youtube' || platform === 'youtube_shorts') {
    const id = getYouTubeVideoId(url);
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }
  return null;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : null;
}
