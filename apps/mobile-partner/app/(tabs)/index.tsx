import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { partnerApi, type Job } from '@/lib/api';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#6B7280', bg: '#F3F4F6' },
  upcoming:    { label: 'Upcoming',    color: '#2563EB', bg: '#DBEAFE' },
  in_progress: { label: 'In Progress', color: '#D97706', bg: '#FEF3C7' },
  completed:   { label: 'Completed',   color: '#16A34A', bg: '#DCFCE7' },
  cancelled:   { label: 'Cancelled',   color: '#D4183D', bg: '#FEE2E2' },
} as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function JobRow({ job }: { job: Job }) {
  const colors = useColors();
  const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.upcoming;
  return (
    <TouchableOpacity
      onPress={() => router.push(`/job/${job.id}`)}
      style={[styles.jobRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
      activeOpacity={0.82}
    >
      <View style={styles.jobLeft}>
        <Text style={[styles.jobService, { color: colors.foreground }]} numberOfLines={1}>{job.serviceName}</Text>
        <Text style={[styles.jobCustomer, { color: colors.mutedForeground }]}>
          <Ionicons name="person-outline" size={12} /> {job.customerName ?? 'Customer'}
        </Text>
        <Text style={[styles.jobDate, { color: colors.mutedForeground }]}>
          <Ionicons name="time-outline" size={12} /> {fmtDate(job.scheduledAt)}
        </Text>
      </View>
      <View style={styles.jobRight}>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Text style={[styles.jobPrice, { color: colors.primary }]}>₹{job.price}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, accessToken } = useAuth();
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data: jobs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['/api/partner/jobs', accessToken],
    queryFn: () => partnerApi.listJobs(accessToken!),
    enabled: !!accessToken,
  });

  const { data: earnings } = useQuery({
    queryKey: ['/api/partner/earnings', accessToken],
    queryFn: () => partnerApi.getEarnings(accessToken!),
    enabled: !!accessToken,
  });

  const todayJobs = (jobs ?? []).filter((j: Job) => {
    const d = new Date(j.scheduledAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const activeJobs = (jobs ?? []).filter((j: Job) => ['upcoming', 'in_progress', 'pending'].includes(j.status));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.headerGreet}>Good {greeting()} 👋</Text>
          <Text style={styles.headerName}>{user?.fullName ?? 'Partner'}</Text>
        </View>
        <View style={[styles.onlineBadge, { backgroundColor: '#dcfce7' }]}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      </View>

      <FlatList
        data={activeJobs.slice(0, 5)}
        keyExtractor={(j) => j.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.content}>
            {/* Stats */}
            <View style={styles.statsRow}>
              <StatCard
                icon="today-outline"
                label="Today's Jobs"
                value={String(todayJobs.length)}
                colors={colors}
              />
              <StatCard
                icon="wallet-outline"
                label="Today's Earnings"
                value={`₹${earnings?.today ?? 0}`}
                colors={colors}
              />
              <StatCard
                icon="calendar-outline"
                label="This Month"
                value={`₹${earnings?.thisMonth ?? 0}`}
                colors={colors}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active Jobs</Text>
          </View>
        }
        renderItem={({ item }) => <View style={{ paddingHorizontal: 16 }}><JobRow job={item} /></View>}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No active jobs right now</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          activeJobs.length > 5 ? (
            <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')} style={styles.viewAll}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View all jobs →</Text>
            </TouchableOpacity>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      />
    </View>
  );
}

function StatCard({ icon, label, value, colors }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerGreet: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  headerName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16a34a' },
  onlineText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  content: { padding: 16, gap: 16 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 10, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  jobRow: { padding: 14, marginBottom: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobLeft: { flex: 1, gap: 3 },
  jobRight: { alignItems: 'flex-end', gap: 6 },
  jobService: { fontSize: 14, fontWeight: '700' },
  jobCustomer: { fontSize: 12 },
  jobDate: { fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  jobPrice: { fontSize: 14, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14 },
  viewAll: { alignItems: 'center', padding: 16 },
  viewAllText: { fontSize: 14, fontWeight: '700' },
});
