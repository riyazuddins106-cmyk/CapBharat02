import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Linking, Modal, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { partnerApi, type PartnerScheduleJob } from '@/lib/api';

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
function addressText(address: PartnerScheduleJob['address']) {
  if (!address) return '';
  return `${address.line1}${address.line2 ? `, ${address.line2}` : ''}, ${address.city}, ${address.state} ${address.postalCode}`;
}

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(dayKey(new Date()));
  const [passJob, setPassJob] = useState<PartnerScheduleJob | null>(null);
  const [passReason, setPassReason] = useState('');
  const from = dayKey(new Date());
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 29);
  const to = dayKey(toDate);
  const schedule = useQuery({
    queryKey: ['/api/partner/schedule', from, to, accessToken],
    queryFn: () => partnerApi.getSchedule(from, to, accessToken!),
    enabled: !!accessToken,
  });
  const performance = useQuery({
    queryKey: ['/api/partner/performance', accessToken],
    queryFn: () => partnerApi.getPerformance(accessToken!),
    enabled: !!accessToken,
  });
  const days = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return { key: dayKey(date), label: date.toLocaleDateString('en-IN', { weekday: 'short' }), day: date.getDate() };
  }), []);
  const jobs = (schedule.data ?? []).filter(job => dayKey(new Date(job.scheduledAt)) === selectedDate);
  const jobCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const job of schedule.data ?? []) {
      const key = dayKey(new Date(job.scheduledAt));
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [schedule.data]);
  const passMutation = useMutation({
    mutationFn: () => partnerApi.passOrderItemJob(passJob!.id, passReason.trim(), accessToken!),
    onSuccess: (result) => {
      setPassJob(null);
      setPassReason('');
      queryClient.invalidateQueries({ queryKey: ['/api/partner/schedule'] });
      queryClient.invalidateQueries({ queryKey: ['/api/partner/order-item-jobs'] });
      Alert.alert(
        result.offeredCount ? 'Job offered to other partners' : 'You remain assigned',
        result.message,
      );
    },
    onError: (error: Error) => Alert.alert('Could not pass this job', error.message),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 12), backgroundColor: colors.primary }]}>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.subtitle}>Plan your service day</Text>
      </View>
      <FlatList
        data={jobs}
        keyExtractor={job => `${job.jobType}-${job.id}`}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 10 }}
        refreshControl={<RefreshControl refreshing={schedule.isRefetching} onRefresh={() => { schedule.refetch(); performance.refetch(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            {performance.data && (
              <View style={[styles.metrics, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Metric label="Completed" value={String(performance.data.jobsCompleted)} colors={colors} />
                <Metric label="Completion" value={`${performance.data.completionRate}%`} colors={colors} />
                <Metric label="Acceptance" value={`${performance.data.acceptanceRate}%`} colors={colors} />
                <Metric label="Rating" value={performance.data.rating.toFixed(1)} colors={colors} />
              </View>
            )}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={days}
              keyExtractor={item => item.key}
              contentContainerStyle={{ gap: 8, paddingVertical: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => setSelectedDate(item.key)} style={[styles.day, { backgroundColor: item.key === selectedDate ? colors.primary : colors.card, borderColor: item.key === selectedDate ? colors.primary : colors.border }]}>
                  <Text style={{ color: item.key === selectedDate ? '#fff' : colors.mutedForeground, fontSize: 11 }}>{item.label}</Text>
                  <Text style={{ color: item.key === selectedDate ? '#fff' : colors.foreground, fontWeight: '800', fontSize: 18 }}>{item.day}</Text>
                  <Text style={{ color: item.key === selectedDate ? '#fff' : (jobCountByDate[item.key] ? colors.primary : colors.mutedForeground), fontSize: 9, fontWeight: '700' }}>
                    {jobCountByDate[item.key] ? `${jobCountByDate[item.key]} ${jobCountByDate[item.key] === 1 ? 'job' : 'jobs'}` : 'No jobs'}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ScheduleCard
            job={item}
            colors={colors}
            onPass={() => { setPassJob(item); setPassReason(''); }}
          />
        )}
        ListEmptyComponent={
          schedule.isLoading ? <Text style={[styles.empty, { color: colors.mutedForeground }]}>Loading schedule…</Text>
            : schedule.isError ? <Text style={[styles.empty, { color: '#DC2626' }]}>Could not load schedule. Pull to refresh.</Text>
              : <Text style={[styles.empty, { color: colors.mutedForeground }]}>No jobs scheduled for this day.</Text>
        }
      />
      <Modal visible={!!passJob} transparent animationType="fade" onRequestClose={() => !passMutation.isPending && setPassJob(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Pass this scheduled job?</Text>
            <Text style={[styles.modalCopy, { color: colors.mutedForeground }]}>
              We’ll show it to other eligible partners. You stay assigned unless another partner accepts it.
            </Text>
            <TextInput
              value={passReason}
              onChangeText={setPassReason}
              placeholder="Why can’t you take this job?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={500}
              style={[styles.reasonInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity disabled={passMutation.isPending} onPress={() => setPassJob(null)} style={[styles.modalButton, { borderColor: colors.border }]}>
                <Text style={{ color: colors.mutedForeground, fontWeight: '700' }}>Keep job</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={passMutation.isPending || passReason.trim().length < 3}
                onPress={() => passMutation.mutate()}
                style={[styles.modalButton, { backgroundColor: colors.primary, borderColor: colors.primary, opacity: passMutation.isPending || passReason.trim().length < 3 ? 0.5 : 1 }]}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>{passMutation.isPending ? 'Offering…' : 'Offer to partners'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Metric({ label, value, colors }: any) {
  return <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '800' }}>{value}</Text><Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 3 }}>{label}</Text></View>;
}
function ScheduleCard({ job, colors, onPass }: { job: PartnerScheduleJob; colors: any; onPass: () => void }) {
  const address = addressText(job.address);
  const openMaps = () => address && Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`);
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={[styles.timeBox, { backgroundColor: colors.secondary }]}><Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>{new Date(job.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text></View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: 15, flexShrink: 1 }}>{job.serviceName}</Text>
            <Text style={{ color: colors.primary, backgroundColor: colors.secondary, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, fontSize: 10, fontWeight: '800' }}>
              {job.status === 'partner_accepted' || job.status === 'upcoming' ? 'Scheduled' : (job.status ?? 'Scheduled').replace('_', ' ')}
            </Text>
          </View>
          <Text style={{ color: colors.mutedForeground, marginTop: 3 }}>{job.customerName ?? 'Customer'} · {job.durationMinutes} min</Text>
          {address ? <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6 }} numberOfLines={2}>{address}</Text> : null}
        </View>
        <Text style={{ color: colors.primary, fontWeight: '800' }}>₹{job.payout}</Text>
      </View>
      {address && <TouchableOpacity onPress={openMaps} style={{ marginTop: 12 }}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Open in Maps</Text></TouchableOpacity>}
      {job.jobType === 'order_item' && job.status === 'partner_accepted' && new Date(job.scheduledAt).getTime() > Date.now() && (
        <TouchableOpacity onPress={onPass} disabled={job.handoffPending} style={[styles.passButton, { borderColor: colors.border, opacity: job.handoffPending ? 0.65 : 1 }]}>
          <Ionicons name="swap-horizontal-outline" size={15} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>
            {job.handoffPending ? 'Offered to other partners' : 'Pass to another partner'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  metrics: { flexDirection: 'row', padding: 14, borderWidth: 1 },
  day: { width: 58, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderRadius: 12, gap: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  card: { padding: 14, borderWidth: 1 },
  timeBox: { paddingHorizontal: 8, paddingVertical: 9, borderRadius: 9 },
  empty: { textAlign: 'center', paddingVertical: 34 },
  passButton: { marginTop: 12, borderWidth: 1, borderRadius: 9, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  modalCard: { borderWidth: 1, borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalCopy: { fontSize: 13, lineHeight: 19, marginTop: 7 },
  reasonInput: { minHeight: 92, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 16, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalButton: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});