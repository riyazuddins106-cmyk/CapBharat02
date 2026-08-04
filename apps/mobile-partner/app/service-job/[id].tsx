import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { partnerApi } from '@/lib/api';

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });
}

export default function ServiceJobDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: job, isLoading, refetch } = useQuery({
    queryKey: ['/api/partner/order-item-jobs/detail', id, accessToken],
    queryFn: () => partnerApi.getOrderItemJob(id!, accessToken!),
    enabled: !!id && !!accessToken,
  });

  const action = useMutation({
    mutationFn: async (kind: 'accept' | 'reject' | 'checkin' | 'complete') => {
      if (kind === 'accept') return partnerApi.acceptOrderItemJob(job!.requestId!, accessToken!);
      if (kind === 'reject') return partnerApi.rejectOrderItemJob(job!.requestId!, accessToken!);
      if (kind === 'checkin') return partnerApi.checkInOrderItem(id!, accessToken!);
      return partnerApi.completeOrderItem(id!, accessToken!);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/partner/order-item-jobs'] });
      await refetch();
    },
    onError: (error: any) => Alert.alert('Unable to update service', error.message),
  });

  if (isLoading || !job) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.mutedForeground }}>Loading service job…</Text></View>;
  }

  const canCheckIn = job.status === 'partner_accepted';
  const canComplete = ['payment_completed', 'service_started'].includes(job.status ?? '');
  const canRespond = !!job.requestId;
  const address = job.address
    ? `${job.address.line1}${job.address.line2 ? `, ${job.address.line2}` : ''}, ${job.address.city}, ${job.address.state} ${job.address.postalCode}`
    : 'Address not provided';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.foreground} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>{job.serviceName}</Text>
          <Text style={{ color: colors.mutedForeground }}>Service order · {job.orderId.slice(0, 8)}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <View style={[styles.statusCard, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
          <Text style={[styles.status, { color: colors.primary }]}>{(job.status ?? 'assigned').replaceAll('_', ' ')}</Text>
          <Text style={{ color: colors.mutedForeground }}>{formatDate(job.scheduledAt)} · {job.durationMinutes} minutes</Text>
          <Text style={[styles.payout, { color: colors.foreground }]}>₹{job.partnerPayout} partner payout</Text>
        </View>

        <InfoCard title="Customer" colors={colors}>
          <InfoRow icon="person-outline" label="Name" value={job.customer.name} colors={colors} />
          {job.customer.phone && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${job.customer.phone}`)}>
              <InfoRow icon="call-outline" label="Phone" value={job.customer.phone} colors={colors} />
            </TouchableOpacity>
          )}
        </InfoCard>
        <InfoCard title="Service location" colors={colors}>
          <InfoRow icon="location-outline" label="Address" value={address} colors={colors} />
          {job.address && <TouchableOpacity onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`)}>
            <Text style={[styles.mapLink, { color: colors.primary }]}>Open in Maps</Text>
          </TouchableOpacity>}
        </InfoCard>
        <InfoCard title="Payment" colors={colors}>
          <InfoRow icon="card-outline" label="Status" value={job.payment?.status === 'paid' ? 'Paid' : 'Awaiting customer payment'} colors={colors} />
          <InfoRow icon="cash-outline" label="Customer amount" value={`₹${job.customerPrice ?? job.payment?.amount ?? 0}`} colors={colors} />
        </InfoCard>
        {job.orderNotes && <InfoCard title="Customer notes" colors={colors}><Text style={{ color: colors.foreground }}>{job.orderNotes}</Text></InfoCard>}
        {canRespond && <View style={styles.responseRow}>
          <TouchableOpacity onPress={() => action.mutate('reject')} style={[styles.secondaryButton, { borderColor: '#FCA5A5' }]}><Text style={{ color: '#DC2626', fontWeight: '800' }}>Reject Request</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => action.mutate('accept')} style={[styles.primaryButton, { flex: 1, backgroundColor: colors.primary }]}><Text style={styles.buttonText}>Accept Request</Text></TouchableOpacity>
        </View>}
        {canCheckIn && <TouchableOpacity onPress={() => action.mutate('checkin')} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={styles.buttonText}>Mark Arrived & Request Payment</Text></TouchableOpacity>}
        {canComplete && <TouchableOpacity onPress={() => action.mutate('complete')} style={[styles.primaryButton, { backgroundColor: '#16A34A' }]}><Text style={styles.buttonText}>Complete Service</Text></TouchableOpacity>}
      </ScrollView>
    </View>
  );
}

function InfoCard({ title, colors, children }: any) {
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>{children}</View>;
}

function InfoRow({ icon, label, value, colors }: any) {
  return <View style={styles.row}><Ionicons name={icon} size={17} color={colors.primary} /><View style={{ flex: 1 }}><Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{label}</Text><Text style={{ color: colors.foreground, fontSize: 14, marginTop: 2 }}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  back: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700' },
  statusCard: { padding: 16, marginBottom: 14, gap: 6 },
  status: { fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
  payout: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  card: { borderWidth: 1, padding: 14, marginBottom: 12, gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  mapLink: { fontWeight: '700', marginLeft: 27 },
  primaryButton: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  secondaryButton: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center', marginTop: 4 },
  responseRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '800' },
});