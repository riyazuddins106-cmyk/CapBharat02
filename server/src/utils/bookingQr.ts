import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const QR_TTL = '5m'; // Short-lived: presence proof, not a persistent credential

/**
 * Use a domain-separated secret so QR tokens cannot be confused with
 * access tokens (which are signed with JWT_SECRET alone).
 */
function qrSecret(): string {
  return `${env.JWT_SECRET}::booking-qr-checkin`;
}

export function signBookingQrToken(bookingId: string): string {
  return jwt.sign(
    { bookingId, typ: 'checkin' },
    qrSecret(),
    { expiresIn: QR_TTL },
  );
}

export function verifyBookingQrToken(token: string): { bookingId: string } {
  const payload = jwt.verify(token, qrSecret()) as { bookingId?: string; typ?: string };
  if (payload.typ !== 'checkin' || !payload.bookingId) {
    throw new Error('Invalid QR token type');
  }
  return { bookingId: payload.bookingId };
}

export function signOrderItemQrToken(orderId: string, orderItemId: string): string {
  return jwt.sign(
    { orderId, orderItemId, typ: 'order-item-checkin' },
    qrSecret(),
    { expiresIn: QR_TTL },
  );
}

export function verifyOrderItemQrToken(token: string): { orderId: string; orderItemId: string } {
  const payload = jwt.verify(token, qrSecret()) as {
    orderId?: string;
    orderItemId?: string;
    typ?: string;
  };
  if (payload.typ !== 'order-item-checkin' || !payload.orderId || !payload.orderItemId) {
    throw new Error('Invalid order-item QR token type');
  }
  return { orderId: payload.orderId, orderItemId: payload.orderItemId };
}
