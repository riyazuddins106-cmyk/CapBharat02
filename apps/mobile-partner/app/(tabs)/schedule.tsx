import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Linking, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
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
  const [selectedDate, setSelectedDate] = useState(dayKey(new Date()));
  const from = dayKey(new Date());
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 6);
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
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return { key: dayKey(date), label: date.toLocaleDateString('en-IN', { weekday: 'short' }), day: date.getDate() };
  }), []);
  const jobs = (schedule.data ?? []).filter(job => dayKey(new Date(job.scheduledAt)) === selectedDate);

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
                </TouchableOpacity>
              )}
            />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
        }
        renderItem={({ item }) => <ScheduleCard job={item} colors={colors} />}
        ListEmptyComponent={
          schedule.isLoading ? <Text style={[styles.empty, { color: colors.mutedForeground }]}>Loading schedule…</Text>
            : schedule.isError ? <Text style={[styles.empty, { color: '#DC2626' }]}>Could not load schedule. Pull to refresh.</Text>
              : <Text style={[styles.empty, { color: colors.mutedForeground }]}>No jobs scheduled for this day.</Text>
        }
      />
    </View>
  );
}

function Metric({ label, value, colors }: any) {
  return <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '800' }}>{value}</Text><Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 3 }}>{label}</Text></View>;
}
function ScheduleCard({ job, colors }: { job: PartnerScheduleJob; colors: any }) {
  const address = addressText(job.address);
  const openMaps = () => address && Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`);
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={[styles.timeBox, { backgroundColor: colors.secondary }]}><Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>{new Date(job.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: 15 }}>{job.serviceName}</Text>
          <Text style={{ color: colors.mutedForeground, marginTop: 3 }}>{job.customerName ?? 'Customer'} · {job.durationMinutes} min</Text>
          {address ? <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6 }} numberOfLines={2}>{address}</Text> : null}
        </View>
        <Text style={{ color: colors.primary, fontWeight: '800' }}>₹{job.payout}</Text>
      </View>
      {address && <TouchableOpacity onPress={openMaps} style={{ marginTop: 12 }}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Open in Maps</Text></TouchableOpacity>}
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
});