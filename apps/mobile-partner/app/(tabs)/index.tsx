import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import {
  partnerApi,
  notificationsApi,
  documentsApi,
  type Job,
  type OrderItemJob,
  type DocumentTypeConfig,
  type PartnerDocument,
  type PartnerProfile,
} from '@/lib/api';
import { NativeIcon } from '@/components/NativeIcon';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#6B7280', bg: '#F3F4F6' },
  upcoming:    { label: 'Upcoming',    color: '#2563EB', bg: '#DBEAFE' },
  in_progress: { label: 'In Progress', color: '#D97706', bg: '#FEF3C7' },
  completed:   { label: 'Completed',   color: '#16A34A', bg: '#DCFCE7' },
  cancelled:   { label: 'Cancelled',   color: '#D4183D', bg: '#FEE2E2' },
} as const;

type DashboardNoticeKind = 'danger' | 'warning' | 'neutral' | 'success';

interface DashboardNotice {
  label: string;
  message: string;
  kind: DashboardNoticeKind;
  action?: string;
}

function getDashboardNotice(
  profile: PartnerProfile,
  documentTypes: DocumentTypeConfig[],
  documents: PartnerDocument[],
): DashboardNotice {
  const required = documentTypes.filter(type => type.is_active && type.is_mandatory);
  const docByType = Object.fromEntries(documents.map(document => [document.document_type, document]));
  const missing = required.filter(type => !docByType[type.type_key]);
  const attention = required.filter(type => {
    const document = docByType[type.type_key];
    if (!document) return false;
    return ['rejected', 're_upload_required', 'expired'].includes(document.status);
  });
  const pending = required.filter(type => {
    const document = docByType[type.type_key];
    return Boolean(document && ['pending', 'under_review'].includes(document.status));
  });

  if (missing.length > 0) {
    return {
      label: 'Documents Required',
      message: 'Upload the required documents to become eligible for jobs.',
      kind: 'danger',
      action: 'Upload Documents',
    };
  }
  if (attention.length > 0) {
    return {
      label: 'Documents Need Attention',
      message: 'Update your rejected or expired documents to start receiving job requests.',
      kind: 'danger',
      action: 'Update Documents',
    };
  }
  if (pending.length > 0) {
    return {
      label: 'Documents Under Review',
      message: 'Your documents are being reviewed. You will be eligible to receive jobs after approval.',
      kind: 'warning',
      action: 'View Documents',
    };
  }

  const availability = profile.availabilityStatus ?? 'available';
  if (availability === 'offline') {
    return {
      label: 'Offline',
      message: 'You are offline and will not receive new job requests. Go online when you are ready.',
      kind: 'neutral',
    };
  }
  if (availability === 'busy') {
    return {
      label: 'Busy',
      message: 'You are marked as busy and will not receive new job requests. Set yourself to Available when ready.',
      kind: 'warning',
    };
  }
  return {
    label: 'Available',
    message: 'You are available and eligible to receive new job requests.',
    kind: 'success',
  };
}

function DashboardStatusNotice({
  notice,
  onAction,
}: {
  notice: DashboardNotice;
  onAction: () => void;
}) {
  const colors = useColors();
  const tone = {
    danger: { background: '#FEF2F2', border: '#FECACA', icon: '#B91C1C' },
    warning: { background: '#FFFBEB', border: '#FDE68A', icon: '#B45309' },
    neutral: { background: '#F3F4F6', border: '#D1D5DB', icon: '#4B5563' },
    success: { background: '#F0FDF4', border: '#BBF7D0', icon: '#15803D' },
  }[notice.kind];

  return (
    <View style={[styles.statusNotice, { backgroundColor: tone.background, borderColor: tone.border, borderRadius: colors.radius }]}>
      <View style={[styles.statusNoticeIcon, { backgroundColor: `${tone.icon}18` }]}>
        <Ionicons
          name={notice.kind === 'success' ? 'checkmark-circle-outline' : notice.kind === 'neutral' ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={20}
          color={tone.icon}
        />
      </View>
      <View style={styles.statusNoticeCopy}>
        <Text style={[styles.statusNoticeLabel, { color: tone.icon }]}>{notice.label}</Text>
        <Text style={[styles.statusNoticeMessage, { color: colors.foreground }]}>{notice.message}</Text>
      </View>
      {notice.action && (
        <TouchableOpacity onPress={onAction} style={[styles.statusNoticeAction, { borderColor: tone.icon }]} activeOpacity={0.8}>
          <Text style={[styles.statusNoticeActionText, { color: tone.icon }]}>{notice.action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

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
          <NativeIcon name="person" size={12} /> {job.customerName ?? 'Customer'}
        </Text>
        <Text style={[styles.jobDate, { color: colors.mutedForeground }]}>
          <NativeIcon name="time-outline" size={12} /> {fmtDate(job.scheduledAt)}
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

function DashboardServiceCard({ item, onAction }: {
  item: OrderItemJob;
  onAction: (action: 'accept' | 'reject', item: OrderItemJob) => void;
}) {
  const colors = useColors();
  const isPending = !item.status || item.status === 'assigned';
  return (
    <TouchableOpacity
      onPress={() => router.push(`/service-job/${item.orderItemId}`)}
      style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
      activeOpacity={0.84}
    >
      <View style={styles.serviceCardHeader}>
        <View style={[styles.serviceIcon, { backgroundColor: colors.secondary }]}>
          <NativeIcon name="layers-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.serviceName, { color: colors.foreground }]} numberOfLines={1}>
            {item.serviceName ?? 'Service booking'}
          </Text>
          <Text style={[styles.serviceMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.customerName ?? 'Customer'} · Order {item.orderId.slice(0, 8)}
          </Text>
        </View>
        <View style={[styles.requestBadge, { backgroundColor: isPending ? '#FEF3C7' : '#DBEAFE' }]}>
          <Text style={[styles.requestBadgeText, { color: isPending ? '#B45309' : '#2563EB' }]}>
            {isPending ? 'New request' : 'In progress'}
          </Text>
        </View>
      </View>
      <View style={[styles.serviceDivider, { backgroundColor: colors.border }]} />
      <View style={styles.serviceDetails}>
        <View style={styles.serviceDetail}>
          <NativeIcon name="time-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.serviceDetailText, { color: colors.mutedForeground }]}>
            {fmtDate(item.scheduledAt)} · {item.durationMinutes} min
          </Text>
        </View>
        <View style={styles.serviceDetail}>
          <NativeIcon name="cash-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.serviceDetailText, { color: colors.foreground, fontWeight: '700' }]}>
            ₹{item.partnerPayout}
          </Text>
        </View>
      </View>
      {isPending ? (
        <View style={styles.serviceActions}>
          <TouchableOpacity
            onPress={(event) => { event.stopPropagation?.(); onAction('reject', item); }}
            style={[styles.serviceAction, { backgroundColor: '#FEE2E2' }]}
          >
            <Text style={[styles.serviceActionText, { color: '#B91C1C' }]}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={(event) => { event.stopPropagation?.(); onAction('accept', item); }}
            style={[styles.serviceAction, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.serviceActionText, { color: '#fff' }]}>Accept</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.openJobHint, { backgroundColor: colors.secondary }]}>
          <NativeIcon name="chevron-forward" size={15} color={colors.primary} />
          <Text style={[styles.openJobText, { color: colors.primary }]}>Open service details</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, accessToken } = useAuth();
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const queryClient = useQueryClient();

  const { data: jobs, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['/api/partner/jobs', accessToken],
    queryFn: () => partnerApi.listJobs(accessToken!),
    enabled: !!accessToken,
  });

  const { data: serviceJobs, isRefetching: isServiceRefetching, refetch: refetchServiceJobs } = useQuery({
    queryKey: ['/api/partner/order-item-jobs', accessToken],
    queryFn: () => partnerApi.listOrderItemJobs(accessToken!),
    enabled: !!accessToken,
    refetchInterval: 30_000,
  });

  const { data: earnings } = useQuery({
    queryKey: ['/api/partner/earnings', accessToken],
    queryFn: () => partnerApi.getEarnings(accessToken!),
    enabled: !!accessToken,
  });

  const { data: profile } = useQuery({
    queryKey: ['/api/partner/profile', accessToken],
    queryFn: () => partnerApi.getProfile(accessToken!),
    enabled: !!accessToken,
  });

  const {
    data: documentTypes = [],
    isLoading: areDocumentTypesLoading,
    isError: areDocumentTypesError,
    refetch: refetchDocumentTypes,
  } = useQuery({
    queryKey: ['doc-types', accessToken],
    queryFn: () => documentsApi.listTypes(accessToken!),
    enabled: !!accessToken,
    refetchOnMount: 'always',
  });

  const {
    data: documents = [],
    isLoading: areDocumentsLoading,
    isError: areDocumentsError,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ['docs', accessToken],
    queryFn: () => documentsApi.list(accessToken!),
    enabled: !!accessToken,
    refetchOnMount: 'always',
  });

  const availabilityStatus = profile?.availabilityStatus ?? 'available';
  const dashboardNotice = profile && !areDocumentTypesLoading && !areDocumentsLoading && !areDocumentTypesError && !areDocumentsError
    ? getDashboardNotice(profile, documentTypes, documents)
    : null;

  const availabilityMutation = useMutation({
    mutationFn: (status: 'available' | 'offline' | 'busy') =>
      partnerApi.updateAvailability(status, accessToken!),
    onSuccess: (updated) => {
      queryClient.setQueryData(['/api/partner/profile', accessToken], updated);
    },
    onError: () => Alert.alert('Error', 'Could not update availability. Try again.'),
  });

  const serviceAction = useMutation<unknown, Error, { action: 'accept' | 'reject'; item: OrderItemJob }>({
    mutationFn: ({ action, item }: { action: 'accept' | 'reject'; item: OrderItemJob }) => {
      if (action === 'accept') return partnerApi.acceptOrderItemJob(item.requestId!, accessToken!);
      return partnerApi.rejectOrderItemJob(item.requestId!, accessToken!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner/order-item-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/partner/jobs'] });
    },
    onError: (error: any) => Alert.alert('Could not update request', error?.message ?? 'Please try again.'),
  });

  const cycleAvailability = () => {
    const next: Record<string, 'available' | 'offline' | 'busy'> = {
      available: 'busy',
      busy: 'offline',
      offline: 'available',
    };
    const nextStatus = next[availabilityStatus] ?? 'available';
    availabilityMutation.mutate(nextStatus);
  };

  const { data: unreadData } = useQuery({
    queryKey: ['/api/notifications/unread-count', accessToken],
    queryFn: () => notificationsApi.unreadCount(accessToken!),
    enabled: !!accessToken,
    refetchInterval: 30000,
  });
  const unreadNotifCount = unreadData?.count ?? 0;

  const todayJobs = (jobs ?? []).filter((j: Job) => {
    const d = new Date(j.scheduledAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const activeJobs = (jobs ?? []).filter((j: Job) => ['upcoming', 'in_progress', 'pending'].includes(j.status));
  const pendingServiceJobs = serviceJobs?.pendingRequests ?? [];
  const activeServiceJobs = serviceJobs?.activeJobs ?? [];

  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.primary }]}>
          <View>
            <Text style={styles.headerGreet}>Good {greeting()} 👋</Text>
            <Text style={styles.headerName}>{user?.fullName ?? 'Partner'}</Text>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground, textAlign: 'center' }}>
            Couldn't load dashboard
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ backgroundColor: colors.primary, borderRadius: colors.radius, paddingHorizontal: 28, paddingVertical: 12 }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.headerGreet}>Good {greeting()} 👋</Text>
          <Text style={styles.headerName}>{user?.fullName ?? 'Partner'}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
          >
            <NativeIcon name="notifications-outline" size={20} color="#fff" />
            {unreadNotifCount > 0 && (
              <View style={[styles.notifBadge, { borderColor: colors.primary }]}>
                <Text style={styles.notifBadgeText}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={cycleAvailability}
            activeOpacity={0.8}
            disabled={availabilityMutation.isPending}
            style={[
              styles.onlineBadge,
              {
                backgroundColor:
                  availabilityStatus === 'available' ? '#dcfce7'
                  : availabilityStatus === 'busy' ? '#fef3c7'
                  : '#f3f4f6',
                opacity: availabilityMutation.isPending ? 0.6 : 1,
              },
            ]}
          >
            <View style={[
              styles.onlineDot,
              {
                backgroundColor:
                  availabilityStatus === 'available' ? '#16a34a'
                  : availabilityStatus === 'busy' ? '#d97706'
                  : '#6b7280',
              },
            ]} />
            <Text style={[
              styles.onlineText,
              {
                color:
                  availabilityStatus === 'available' ? '#16a34a'
                  : availabilityStatus === 'busy' ? '#d97706'
                  : '#6b7280',
              },
            ]}>
              {availabilityStatus === 'available' ? 'Online'
                : availabilityStatus === 'busy' ? 'Busy'
                : 'Offline'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={activeJobs.slice(0, 5)}
        keyExtractor={(j) => j.id}
        refreshControl={<RefreshControl refreshing={isRefetching || isServiceRefetching} onRefresh={() => {
          refetch();
          refetchServiceJobs();
          refetchDocumentTypes();
          refetchDocuments();
        }} tintColor={colors.primary} />}
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

             {dashboardNotice && (
               <DashboardStatusNotice
                 notice={dashboardNotice}
                 onAction={() => router.push('/documents')}
               />
             )}

            {pendingServiceJobs.length > 0 && (
              <>
                <View style={styles.sectionHeadingRow}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>New requests</Text>
                  <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.countBadgeText}>{pendingServiceJobs.length}</Text>
                  </View>
                </View>
                {pendingServiceJobs.slice(0, 3).map((item) => (
                  <DashboardServiceCard
                    key={item.requestId ?? item.orderItemId}
                    item={item}
                    onAction={(action, selected) => serviceAction.mutate({ action, item: selected })}
                  />
                ))}
                {pendingServiceJobs.length > 3 && (
                  <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')} style={styles.viewAll}>
                    <Text style={[styles.viewAllText, { color: colors.primary }]}>View all {pendingServiceJobs.length} requests →</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active Jobs</Text>
            {activeServiceJobs.map((item) => (
              <DashboardServiceCard
                key={item.orderItemId}
                item={item}
                onAction={() => undefined}
              />
            ))}
          </View>
        }
        renderItem={({ item }) => <View style={{ paddingHorizontal: 16 }}><JobRow job={item} /></View>}
         ListEmptyComponent={
          !isLoading && pendingServiceJobs.length === 0 && activeServiceJobs.length === 0 ? (
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
           <NativeIcon name={icon} size={20} color={colors.primary} />
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifBtn: { width: 34, height: 34, borderRadius: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  notifBadge: { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, backgroundColor: '#D4183D' },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16a34a' },
  onlineText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  content: { padding: 16, gap: 16 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statusNotice: { borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  statusNoticeIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusNoticeCopy: { flex: 1, gap: 3 },
  statusNoticeLabel: { fontSize: 13, fontWeight: '800' },
  statusNoticeMessage: { fontSize: 12, lineHeight: 17 },
  statusNoticeAction: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7, alignSelf: 'center' },
  statusNoticeActionText: { fontSize: 10, fontWeight: '800' },
  statCard: { flex: 1, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 10, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  serviceCard: { padding: 14, marginBottom: 10, borderWidth: 1 },
  serviceCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  serviceIcon: { width: 38, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 14, fontWeight: '700' },
  serviceMeta: { fontSize: 12, marginTop: 2 },
  requestBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  requestBadgeText: { fontSize: 10, fontWeight: '700' },
  serviceDivider: { height: 1, marginVertical: 10 },
  serviceDetails: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  serviceDetail: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  serviceDetailText: { fontSize: 11 },
  serviceActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  serviceAction: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  serviceActionText: { fontSize: 12, fontWeight: '700' },
  openJobHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  openJobText: { fontSize: 12, fontWeight: '700' },
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
