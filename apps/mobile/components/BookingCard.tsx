import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { bookingsApi, type Booking } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',      color: '#7C3AED', bg: '#EDE9FE' },
  upcoming:    { label: 'Upcoming',    color: '#2563EB', bg: '#DBEAFE' },
  in_progress: { label: 'In Progress', color: '#D97706', bg: '#FEF3C7' },
  completed:   { label: 'Completed',   color: '#16A34A', bg: '#DCFCE7' },
  cancelled:   { label: 'Cancelled',   color: '#D4183D', bg: '#FEE2E2' },
} as const;

const PAYMENT_PENDING_COLOR = '#D97706';
const PAYMENT_PENDING_BG    = '#FFFBEB';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  booking: Booking;
  onCancel?: (id: string) => void;
  onReview?: (booking: Booking) => void;
  onPay?: (booking: Booking) => void;
}

export function BookingCard({ booking, onCancel, onReview, onPay }: Props) {
  const colors = useColors();
  const { accessToken } = useAuth();
  const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.upcoming;
  // Payment is due only after the partner checks in. A confirmed/upcoming
  // booking must not expose a payment action yet.
  const isAwaitingPayment = ['in_progress', 'completed'].includes(booking.status) && booking.paymentStatus !== 'paid';
  const displayCfg = cfg;
  const [showQR, setShowQR] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  const openQR = async () => {
    setShowQR(true);
    if (qrToken) return; // already fetched
    setQrLoading(true);
    setQrError(null);
    try {
      const data = await bookingsApi.getQrToken(booking.id, accessToken!);
      setQrToken(data.qrToken);
    } catch (e: any) {
      setQrError(e.message ?? 'Failed to load QR code');
    } finally {
      setQrLoading(false);
    }
  };

  return (
    <>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconWrap}
            activeOpacity={0.7}
            onPress={() => booking.serviceId && router.push(`/service/${booking.serviceId}`)}
          >
            <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="construct-outline" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.service, { color: colors.foreground }]} numberOfLines={1}>{booking.serviceName}</Text>
              {booking.status === 'pending' ? (
                <Text style={[styles.pro, { color: '#7C3AED', fontStyle: 'italic' }]}>Searching for professional…</Text>
              ) : (
                <Text style={[styles.pro, { color: colors.mutedForeground }]}>{booking.proName}</Text>
              )}
            </View>
          </TouchableOpacity>
          <View style={[styles.badge, { backgroundColor: displayCfg.bg }]}>
            <Text style={[styles.badgeText, { color: displayCfg.color }]}>{displayCfg.label}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.details}>
          <View style={styles.detail}>
            <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>{fmtDate(booking.scheduledAt)}</Text>
          </View>
          <View style={styles.detail}>
            <Ionicons name="cash-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.foreground, fontWeight: '600' }]}>₹{booking.price}</Text>
          </View>
        </View>

        {booking.notes && (
          <Text style={[styles.notes, { color: colors.mutedForeground }]} numberOfLines={2}>"{booking.notes}"</Text>
        )}

        {/* Payment pending banner — partner checked in but payment is not recorded */}
        {isAwaitingPayment && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: PAYMENT_PENDING_BG, borderRadius: 8, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#FDE68A' }}>
            <Ionicons name="time-outline" size={15} color={PAYMENT_PENDING_COLOR} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: PAYMENT_PENDING_COLOR }}>Payment Pending</Text>
              <Text style={{ fontSize: 11, color: '#92400E', marginTop: 1 }}>
                {booking.status === 'completed'
                  ? `Your service is complete. Pay ₹${booking.price} to settle the booking.`
                  : `Your partner has checked in. Pay ₹${booking.price} to begin the service.`}
              </Text>
            </View>
          </View>
        )}

        {/* Payment received indicator — completed and paid */}
        {booking.status === 'completed' && booking.paymentStatus === 'paid' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#BBF7D0' }}>
            <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#16A34A' }}>Payment Received</Text>
          </View>
        )}

        {/* Actions row — QR + Pay Now (inline for active) / Rate Service */}
        <View style={styles.actions}>
          {/* QR Code — show for all active bookings so partner can scan to check in */}
          {(booking.status === 'pending' || booking.status === 'upcoming' || booking.status === 'in_progress') && (
            <TouchableOpacity
              onPress={openQR}
              style={[styles.actionBtn, { borderColor: colors.primary, backgroundColor: colors.secondary, flex: 0, paddingHorizontal: 14 }]}
              activeOpacity={0.8}
            >
              <Ionicons name="qr-code-outline" size={15} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Show QR</Text>
            </TouchableOpacity>
          )}
          {/* Payment is available only after partner check-in. */}
          {booking.status === 'in_progress' && booking.paymentStatus !== 'paid' && onPay && (
            <TouchableOpacity
              onPress={() => onPay(booking)}
              style={[styles.actionBtn, { borderColor: colors.primary, backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Ionicons name="wallet-outline" size={14} color="#fff" />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Pay Now</Text>
            </TouchableOpacity>
          )}
          {/* Rate Service — only after payment confirmed */}
          {booking.status === 'completed' && booking.paymentStatus === 'paid' && !booking.reviewed && onReview && (
            <TouchableOpacity
              onPress={() => onReview(booking)}
              style={[styles.actionBtn, { borderColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Rate Service</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cancel — full-width prominent button on its own row */}
        {['pending', 'upcoming'].includes(booking.status) && onCancel && (
          <TouchableOpacity
            onPress={() => onCancel(booking.id)}
            style={[styles.cancelBtn, { borderColor: '#DC2626', backgroundColor: '#FEF2F2' }]}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={15} color="#DC2626" />
            <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Cancel Booking</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* QR Code Modal */}
      <Modal visible={showQR} transparent animationType="fade" onRequestClose={() => setShowQR(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.qrSheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.qrHeader}>
              <View>
                <Text style={[styles.qrTitle, { color: colors.foreground }]}>Booking QR Code</Text>
                <Text style={[styles.qrSub, { color: colors.mutedForeground }]}>{booking.serviceName} · {booking.proName}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQR(false)}>
                <Ionicons name="close-circle" size={28} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={[styles.qrBox, { borderColor: colors.border, borderRadius: colors.radius }]}>
              {qrLoading && <ActivityIndicator size="large" color={colors.primary} style={{ width: 200, height: 200 }} />}
              {qrError && (
                <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="warning-outline" size={32} color={colors.destructive} />
                  <Text style={{ color: colors.destructive, fontSize: 12, textAlign: 'center', marginTop: 8 }}>{qrError}</Text>
                </View>
              )}
              {qrToken && !qrLoading && (
                <QRCode
                  value={qrToken}
                  size={200}
                  color={colors.foreground}
                  backgroundColor={colors.card}
                />
              )}
            </View>

            <Text style={[styles.qrHint, { color: colors.mutedForeground }]}>
              Show this to your service partner when they arrive to check in
            </Text>

            <View style={[styles.qrBadge, { backgroundColor: displayCfg.bg, borderRadius: colors.radius }]}>
              <View style={[styles.qrBadgeDot, { backgroundColor: displayCfg.color }]} />
              <Text style={[styles.qrBadgeText, { color: displayCfg.color }]}>{displayCfg.label}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: 12, borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconWrap: { flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 },
  icon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  service: { fontSize: 14, fontWeight: '700' },
  pro: { fontSize: 12, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, marginVertical: 10 },
  details: { flexDirection: 'row', gap: 16 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { fontSize: 12 },
  notes: { fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  actions: { marginTop: 12, flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingVertical: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  cancelBtn: { marginTop: 8, borderWidth: 1.5, borderRadius: 8, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 },
  // QR Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  qrSheet: { width: '100%', maxWidth: 340, padding: 24, gap: 18 },
  qrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  qrTitle: { fontSize: 17, fontWeight: '700' },
  qrSub: { fontSize: 12, marginTop: 2 },
  qrBox: { alignSelf: 'center', padding: 16, borderWidth: 1 },
  qrHint: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  qrBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 },
  qrBadgeDot: { width: 7, height: 7, borderRadius: 4 },
  qrBadgeText: { fontSize: 13, fontWeight: '700' },
});
