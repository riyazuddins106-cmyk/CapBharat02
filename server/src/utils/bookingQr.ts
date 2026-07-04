import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const QR_TTL = '24h';

export function signBookingQrToken(bookingId: string): string {
  return jwt.sign({ bookingId, purpose: 'checkin' }, env.JWT_SECRET, { expiresIn: QR_TTL });
}

export function verifyBookingQrToken(token: string): { bookingId: string } {
  const payload = jwt.verify(token, env.JWT_SECRET) as { bookingId: string; purpose: string };
  if (payload.purpose !== 'checkin') throw new Error('Invalid QR token purpose');
  return { bookingId: payload.bookingId };
}
