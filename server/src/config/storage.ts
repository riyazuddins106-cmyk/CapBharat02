import fs from 'fs';
import path from 'path';
import { env } from './env.js';

export function ensureUploadsDir(): void {
  const dir = env.UPLOADS_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[storage] Created uploads directory: ${dir}`);
  }
}

export function getUploadsDir(): string {
  return env.UPLOADS_DIR;
}

export function getAvatarPath(userId: string, filename: string): string {
  return path.join(env.UPLOADS_DIR, 'avatars', userId, filename);
}

export function ensureAvatarDir(userId: string): string {
  const dir = path.join(env.UPLOADS_DIR, 'avatars', userId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
