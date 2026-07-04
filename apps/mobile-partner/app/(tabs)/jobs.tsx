import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { partnerApi, type Job, type JobStatus } from '@/lib/api';

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pending',     color: '#6B7280', bg: '#F3F4F6' },
  upcoming:    { label: 'Upcoming',    color: '#2563EB', bg: '#DBEAFE' },
  in_progress: { label: 'In Progress', color: '#D97706', bg: '#FEF3C7' },
  completed:   { label: 'Completed',   color: '#16A34A', bg: '#DCFCE7' },
  cancelled:   { label: 'Cancelled',   color: '#D4183D', bg: '#FEE2E2' },
};

const TABS: { key: string; label: string; statuses: JobStatus[] }[] = [
  { key: 'active',    label: 'Active',    statuses: ['upcoming', 'pending', 'in_progress'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function JobCard({ job }: { job: Job }) {
  const colors = useColors();
  const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.upcoming;
  return (
    <TouchableOpacity
      onPress={() => router.push(`/job/${job.id}`)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
      activeOpacity={0.82}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Ionicons name="construct-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.serviceName, { color: colors.foreground }]} numberOfLines={1}>{job.serviceName}</Text>
          <Text style={[styles.customerName, { color: colors.mutedForeground }]}>
            {job.customerName ?? 'Customer'}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.details}>
        <View style={styles.detail}>
          <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.detailText, { color: colors.mutedForeground }]}>{fmtDate(job.scheduledAt)}</Text>
        </View>
        <View style={styles.detail}>
          <Ionicons name="cash-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.detailText, { color: colors.foreground, fontWeight: '700' }]}>₹{job.price}</Text>
        </View>
      </View>

      {job.status === 'upcoming' || job.status === 'in_progress' ? (
        <View style={[styles.scanHint, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
          <Ionicons name="qr-code-outline" size={14} color={colors.primary} />
          <Text style={[styles.scanHintText, { color: colors.primary }]}>
            {job.status === 'upcoming' ? 'Tap to scan QR & check in' : 'Tap to mark complete'}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function JobsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [tab, setTab] = useState('active');
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data: jobs = [], isRefetching, refetch } = useQuery({
    queryKey: ['/api/partner/jobs', accessToken],
    queryFn: () => partnerApi.listJobs(accessToken!),
    enabled: !!accessToken,
  });

  const activeTab = TABS.find((t) => t.key === tab)!;
  const filtered = jobs.filter((j: Job) => activeTab.statuses.includes(j.status));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Jobs</Text>
        <View style={[styles.tabs, { backgroundColor: colors.muted, borderRadius: 100 }]}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tabBtn, tab === t.key && { backgroundColor: colors.card, borderRadius: 100 }]}
            >
              <Text style={[styles.tabText, { color: tab === t.key ? colors.primary : colors.mutedForeground, fontWeight: tab === t.key ? '700' : '400' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => <JobCard job={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="list-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No {activeTab.label.toLowerCase()} jobs</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {tab === 'active' ? 'New jobs will appear here once assigned.' : 'Your job history will appear here.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  tabs: { flexDirection: 'row', padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 7, alignItems: 'center' },
  tabText: { fontSize: 12 },
  card: { padding: 14, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 38, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 14, fontWeight: '700' },
  customerName: { fontSize: 12, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, marginVertical: 10 },
  details: { flexDirection: 'row', gap: 16 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { fontSize: 12 },
  scanHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, marginTop: 10 },
  scanHintText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', maxWidth: 260 },
});
