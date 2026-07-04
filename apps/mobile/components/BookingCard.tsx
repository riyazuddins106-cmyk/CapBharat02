import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Booking } from '@/lib/api';

const STATUS_CONFIG = {
  upcoming:    { label: 'Upcoming',    color: '#2563EB', bg: '#DBEAFE' },
  in_progress: { label: 'In Progress', color: '#D97706', bg: '#FEF3C7' },
  completed:   { label: 'Completed',   color: '#16A34A', bg: '#DCFCE7' },
  cancelled:   { label: 'Cancelled',   color: '#D4183D', bg: '#FEE2E2' },
} as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  booking: Booking;
  onCancel?: (id: string) => void;
  onReview?: (booking: Booking) => void;
}

export function BookingCard({ booking, onCancel, onReview }: Props) {
  const colors = useColors();
  const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.upcoming;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="construct-outline" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.service, { color: colors.foreground }]} numberOfLines={1}>{booking.serviceName}</Text>
            <Text style={[styles.pro, { color: colors.mutedForeground }]}>{booking.proName}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
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

      {/* Actions */}
      {(booking.status === 'upcoming' || (booking.status === 'completed' && !booking.reviewed)) && (
        <View style={styles.actions}>
          {booking.status === 'upcoming' && onCancel && (
            <TouchableOpacity
              onPress={() => onCancel(booking.id)}
              style={[styles.actionBtn, { borderColor: colors.destructive }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Cancel</Text>
            </TouchableOpacity>
          )}
          {booking.status === 'completed' && !booking.reviewed && onReview && (
            <TouchableOpacity
              onPress={() => onReview(booking)}
              style={[styles.actionBtn, { borderColor: colors.primary, backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Rate Service</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
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
  actionBtn: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
});
