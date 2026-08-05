import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { partnerApi, type Payout } from '@/lib/api';

function fmtDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short' });
}

function fmtPayoutDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function payoutStatus(status: string) {
  switch (status) {
    case 'paid':
      return { label: 'Paid', color: '#16a34a', icon: 'checkmark-circle-outline' as const };
    case 'rejected':
      return { label: 'Rejected', color: '#ef4444', icon: 'close-circle-outline' as const };
    case 'approved':
    case 'processing':
      return { label: 'Processing', color: '#3b82f6', icon: 'sync-outline' as const };
    default:
      return { label: 'Pending', color: '#f59e0b', icon: 'time-outline' as const };
  }
}

type PayoutStatusFilter = 'all' | 'pending' | 'processing' | 'paid' | 'rejected';

const PAYOUT_STATUS_FILTERS: { key: PayoutStatusFilter; label: string }[] = [
  { key: 'all', label: 'All statuses' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'paid', label: 'Paid' },
  { key: 'rejected', label: 'Rejected' },
];

function payoutStatusKey(status: string): Exclude<PayoutStatusFilter, 'all'> {
  if (status === 'paid') return 'paid';
  if (status === 'rejected') return 'rejected';
  if (status === 'approved' || status === 'processing') return 'processing';
  return 'pending';
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatFilterDate(date: Date) {
  const today = new Date();
  if (dateKey(date) === dateKey(today)) return 'Today';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFilterRange(start: Date, end: Date | null) {
  if (!end || dateKey(start) === dateKey(end)) return formatFilterDate(start);
  return `${formatFilterDate(start)} – ${formatFilterDate(end)}`;
}

function calendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)),
  ];
}

export default function EarningsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedPayoutStartDate, setSelectedPayoutStartDate] = useState(() => new Date());
  const [selectedPayoutEndDate, setSelectedPayoutEndDate] = useState<Date | null>(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarSelection, setCalendarSelection] = useState<'start' | 'end'>('start');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<PayoutStatusFilter>('all');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const { data: earnings, isLoading } = useQuery({
    queryKey: ['/api/partner/earnings', accessToken],
    queryFn: () => partnerApi.getEarnings(accessToken!),
    enabled: !!accessToken,
  });

  const {
    data: payouts = [],
    isLoading: payoutsLoading,
    isFetching: payoutsFetching,
    refetch: refetchPayouts,
  } = useQuery({
    queryKey: ['/api/partner/payouts', accessToken],
    queryFn: () => partnerApi.listPayouts(accessToken!),
    enabled: !!accessToken,
  });

  const payoutMutation = useMutation({
    mutationFn: () => {
      const amt = parseFloat(payoutAmount);
      if (!amt || amt < 100) throw new Error('Minimum payout is ₹100');
      return partnerApi.requestPayout(amt, payoutNote, accessToken!);
    },
    onSuccess: (payout) => {
      Alert.alert('Payout Requested', 'Your withdrawal request has been submitted. It will be processed within 2–3 business days.');
      setPayoutAmount('');
      setPayoutNote('');
      setShowPayoutForm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/partner/earnings'] });
      queryClient.setQueryData<Payout[]>(
        ['/api/partner/payouts', accessToken],
        (current = []) => [payout, ...current.filter((item) => item.id !== payout.id)],
      );
    },
    onError: (e: any) => Alert.alert('Error', e.message ?? 'Could not submit payout request. Try again.'),
  });

  const weekly: { date: string; amount: number }[] = earnings?.weekly ?? [];
  const maxAmount = Math.max(...weekly.map((w) => w.amount), 1);
  const selectedStatusLabel = PAYOUT_STATUS_FILTERS.find((filter) => filter.key === payoutStatusFilter)?.label ?? 'All statuses';
  const filteredPayouts = payouts.filter((payout) => {
    const requestedDate = dateKey(new Date(payout.requestedAt));
    const startDate = dateKey(selectedPayoutStartDate);
    const endDate = dateKey(selectedPayoutEndDate ?? selectedPayoutStartDate);
    const dateMatches = requestedDate >= startDate && requestedDate <= endDate;
    const statusMatches = payoutStatusFilter === 'all' || payoutStatusKey(payout.status) === payoutStatusFilter;
    return dateMatches && statusMatches;
  });

  function choosePayoutDate(date: Date) {
    if (calendarSelection === 'start') {
      setSelectedPayoutStartDate(date);
      setSelectedPayoutEndDate(null);
      setCalendarSelection('end');
      setCalendarMonth(date);
      return;
    }

    if (dateKey(date) < dateKey(selectedPayoutStartDate)) {
      setSelectedPayoutStartDate(date);
      setSelectedPayoutEndDate(selectedPayoutStartDate);
    } else {
      setSelectedPayoutEndDate(date);
    }
    setCalendarMonth(date);
    setShowCalendar(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Earnings</Text>
        <Text style={styles.headerSub}>Your income summary</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={payoutsFetching}
            onRefresh={() => { refetchPayouts(); queryClient.invalidateQueries({ queryKey: ['/api/partner/earnings'] }); }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <SummaryCard icon="today-outline" label="Today" value={`₹${earnings?.today ?? 0}`} colors={colors} />
          <SummaryCard icon="calendar-outline" label="This Month" value={`₹${earnings?.thisMonth ?? 0}`} colors={colors} highlight />
          <SummaryCard icon="trophy-outline" label="All Time" value={`₹${earnings?.total ?? 0}`} colors={colors} />
        </View>
        <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>Available to withdraw</Text>
              <Text style={[styles.balanceValue, { color: colors.foreground }]}>₹{earnings?.available ?? 0}</Text>
            </View>
            <Ionicons name="wallet-outline" size={28} color={colors.primary} />
          </View>
          <View style={styles.balanceMeta}>
            <Text style={[styles.balanceMetaText, { color: colors.mutedForeground }]}>Pending: ₹{earnings?.pendingPayout ?? 0}</Text>
            <Text style={[styles.balanceMetaText, { color: colors.mutedForeground }]}>Paid out: ₹{earnings?.paidOut ?? 0}</Text>
          </View>
        </View>

        {/* Weekly bar chart */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>Last 7 Days</Text>
          <View style={styles.chart}>
            {weekly.map((w: { date: string; amount: number }) => {
              const pct = maxAmount > 0 ? w.amount / maxAmount : 0;
              const barH = Math.max(pct * 120, w.amount > 0 ? 8 : 3);
              return (
                <View key={w.date} style={styles.barCol}>
                  <Text style={[styles.barVal, { color: colors.primary }]}>
                    {w.amount > 0 ? `₹${w.amount}` : ''}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[styles.bar, {
                        height: barH,
                        backgroundColor: w.amount > 0 ? colors.primary : colors.muted,
                        borderRadius: 4,
                      }]}
                    />
                  </View>
                  <Text style={[styles.barDay, { color: colors.mutedForeground }]}>{fmtDay(w.date)}</Text>
                </View>
              );
            })}
          </View>

          {weekly.length === 0 && !isLoading && (
            <View style={styles.noData}>
              <Ionicons name="bar-chart-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.noDataText, { color: colors.mutedForeground }]}>No earnings data yet</Text>
            </View>
          )}
        </View>

        {/* Payout request */}
        {showPayoutForm ? (
          <View style={[styles.payoutCard, { backgroundColor: colors.card, borderColor: colors.primary, borderRadius: colors.radius }]}>
            <Text style={[styles.payoutTitle, { color: colors.foreground }]}>Request Withdrawal</Text>
            <Text style={[styles.payoutSub, { color: colors.mutedForeground }]}>Minimum ₹100 · Processed in 2–3 business days</Text>
            <View style={styles.payoutRow}>
              <Text style={[styles.payoutCurr, { color: colors.foreground }]}>₹</Text>
              <TextInput
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                keyboardType="numeric"
                placeholder="Enter amount"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.payoutInput, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
              />
            </View>
            <TextInput
              value={payoutNote}
              onChangeText={setPayoutNote}
              placeholder="Note (optional)"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.payoutNoteInput, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
              maxLength={512}
            />
            <View style={styles.payoutBtns}>
              <TouchableOpacity onPress={() => { setShowPayoutForm(false); setPayoutAmount(''); setPayoutNote(''); }}
                style={[styles.payoutCancel, { borderColor: colors.border, borderRadius: colors.radius }]}>
                <Text style={[styles.payoutCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => payoutMutation.mutate()}
                disabled={payoutMutation.isPending || !payoutAmount}
                style={[styles.payoutSubmit, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: payoutMutation.isPending || !payoutAmount ? 0.5 : 1 }]}>
                {payoutMutation.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.payoutSubmitText}>Submit Request</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => {
              if ((earnings?.available ?? 0) < 100) {
                Alert.alert('Not enough balance', 'You need at least ₹100 of confirmed earnings available to withdraw.');
                return;
              }
              setShowPayoutForm(true);
            }}
            style={[styles.withdrawBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: (earnings?.available ?? 0) >= 100 ? 1 : 0.55 }]}
            activeOpacity={0.85}
          >
            <Ionicons name="wallet-outline" size={18} color="#fff" />
            <Text style={styles.withdrawBtnText}>Request Withdrawal</Text>
          </TouchableOpacity>
        )}

        {/* Payout history */}
        <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.historyHeader}>
            <View>
              <Text style={[styles.historyTitle, { color: colors.foreground }]}>Payout History</Text>
              <Text style={[styles.historySub, { color: colors.mutedForeground }]}>
                Showing {formatFilterRange(selectedPayoutStartDate, selectedPayoutEndDate)} · {selectedStatusLabel}
              </Text>
            </View>
            <Ionicons name="receipt-outline" size={22} color={colors.primary} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.historyFilter, { borderTopColor: colors.border, borderBottomColor: colors.border }]}
          >
            <TouchableOpacity
              onPress={() => {
                const today = new Date();
                setSelectedPayoutStartDate(today);
                setSelectedPayoutEndDate(today);
                setCalendarMonth(today);
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: dateKey(selectedPayoutStartDate) === dateKey(new Date())
                    && dateKey(selectedPayoutEndDate ?? selectedPayoutStartDate) === dateKey(new Date())
                    ? colors.primary
                    : colors.muted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="today-outline"
                size={14}
                color={dateKey(selectedPayoutStartDate) === dateKey(new Date())
                  && dateKey(selectedPayoutEndDate ?? selectedPayoutStartDate) === dateKey(new Date())
                  ? '#fff'
                  : colors.mutedForeground}
              />
              <Text style={[styles.filterChipText, {
                color: dateKey(selectedPayoutStartDate) === dateKey(new Date())
                  && dateKey(selectedPayoutEndDate ?? selectedPayoutStartDate) === dateKey(new Date())
                  ? '#fff'
                  : colors.mutedForeground,
              }]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setCalendarSelection('start');
                setCalendarMonth(selectedPayoutStartDate);
                setShowCalendar(true);
              }}
              style={[styles.filterChip, { backgroundColor: colors.muted, borderColor: colors.border }]}
            >
              <Ionicons name="calendar-outline" size={14} color={colors.primary} />
              <Text style={[styles.filterChipText, { color: colors.foreground }]}>
                {formatFilterRange(selectedPayoutStartDate, selectedPayoutEndDate)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowStatusMenu(true)}
              style={[styles.filterChip, { backgroundColor: payoutStatusFilter !== 'all' ? colors.primary : colors.muted, borderColor: colors.border }]}
            >
              <Ionicons name="funnel-outline" size={14} color={payoutStatusFilter !== 'all' ? '#fff' : colors.primary} />
              <Text style={[styles.filterChipText, { color: payoutStatusFilter !== 'all' ? '#fff' : colors.foreground }]}>{selectedStatusLabel}</Text>
              <Ionicons name="chevron-down" size={13} color={payoutStatusFilter !== 'all' ? '#fff' : colors.mutedForeground} />
            </TouchableOpacity>
          </ScrollView>
          {payoutsLoading ? (
            <View style={styles.historyLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : filteredPayouts.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Ionicons name="wallet-outline" size={30} color={colors.mutedForeground} />
              <Text style={[styles.historyEmptyText, { color: colors.mutedForeground }]}>
                `No payout requests for ${formatFilterRange(selectedPayoutStartDate, selectedPayoutEndDate)}`
              </Text>
            </View>
          ) : (
            <View>
              {filteredPayouts.map((payout) => {
                const status = payoutStatus(payout.status);
                return (
                  <View key={payout.id} style={[styles.payoutHistoryRow, { borderTopColor: colors.border }]}>
                    <View style={styles.payoutHistoryMain}>
                      <Text style={[styles.payoutHistoryAmount, { color: colors.foreground }]}>₹{payout.amount.toLocaleString('en-IN')}</Text>
                      <Text style={[styles.payoutHistoryDate, { color: colors.mutedForeground }]}>{fmtPayoutDate(payout.requestedAt)}</Text>
                      {payout.note ? <Text style={[styles.payoutHistoryNote, { color: colors.mutedForeground }]} numberOfLines={1}>{payout.note}</Text> : null}
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: `${status.color}18` }]}>
                      <Ionicons name={status.icon} size={13} color={status.color} />
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.calendarModal, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={styles.calendarModalHeader}>
                <View>
                  <Text style={[styles.calendarModalTitle, { color: colors.foreground }]}>Filter payout history</Text>
                  <Text style={[styles.historySub, { color: colors.mutedForeground }]}>
                    {calendarSelection === 'start' ? 'Choose start date' : 'Choose end date'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowCalendar(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <View style={styles.rangeSelectionRow}>
                <TouchableOpacity
                  onPress={() => setCalendarSelection('start')}
                  style={[styles.rangeSelection, {
                    backgroundColor: calendarSelection === 'start' ? colors.secondary : colors.muted,
                    borderColor: calendarSelection === 'start' ? colors.primary : colors.border,
                  }]}
                >
                  <Text style={[styles.rangeSelectionLabel, { color: colors.mutedForeground }]}>Start date</Text>
                  <Text style={[styles.rangeSelectionValue, { color: colors.foreground }]}>{formatFilterDate(selectedPayoutStartDate)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCalendarSelection('end')}
                  style={[styles.rangeSelection, {
                    backgroundColor: calendarSelection === 'end' ? colors.secondary : colors.muted,
                    borderColor: calendarSelection === 'end' ? colors.primary : colors.border,
                  }]}
                >
                  <Text style={[styles.rangeSelectionLabel, { color: colors.mutedForeground }]}>End date</Text>
                  <Text style={[styles.rangeSelectionValue, { color: colors.foreground }]}>
                    {selectedPayoutEndDate ? formatFilterDate(selectedPayoutEndDate) : 'Select date'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.monthHeader}>
                <TouchableOpacity
                  onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  style={styles.monthButton}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.monthTitle, { color: colors.foreground }]}>
                  {calendarMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity
                  onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  style={styles.monthButton}
                >
                  <Ionicons name="chevron-forward" size={18} color={colors.foreground} />
                </TouchableOpacity>
              </View>
              <View style={styles.weekHeader}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <Text key={`${day}-${index}`} style={[styles.weekDay, { color: colors.mutedForeground }]}>{day}</Text>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {calendarDays(calendarMonth).map((day, index) => {
                  const dayKey = day ? dateKey(day) : '';
                  const isStart = dayKey === dateKey(selectedPayoutStartDate);
                  const isEnd = !!selectedPayoutEndDate && dayKey === dateKey(selectedPayoutEndDate);
                  const rangeEnd = selectedPayoutEndDate ?? selectedPayoutStartDate;
                  const inRange = !!day && dayKey >= dateKey(selectedPayoutStartDate) && dayKey <= dateKey(rangeEnd);
                  return day ? (
                    <TouchableOpacity
                      key={dateKey(day)}
                      onPress={() => choosePayoutDate(day)}
                      style={[
                        styles.calendarDay,
                        inRange && { backgroundColor: colors.secondary },
                        (isStart || isEnd) && { backgroundColor: colors.primary, borderRadius: 999 },
                      ]}
                    >
                      <Text style={[styles.calendarDayText, { color: isStart || isEnd ? '#fff' : colors.foreground }]}>{day.getDate()}</Text>
                    </TouchableOpacity>
                  ) : <View key={`empty-${index}`} style={styles.calendarDay} />;
                })}
              </View>
              <TouchableOpacity
                onPress={() => choosePayoutDate(new Date())}
                style={[styles.calendarTodayButton, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}
              >
                <Ionicons name="today-outline" size={16} color={colors.primary} />
                <Text style={[styles.calendarTodayText, { color: colors.primary }]}>Start over with today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showStatusMenu} transparent animationType="fade" onRequestClose={() => setShowStatusMenu(false)}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowStatusMenu(false)}>
            <View style={[styles.statusMenu, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.calendarModalTitle, { color: colors.foreground }]}>Filter by status</Text>
              {PAYOUT_STATUS_FILTERS.map((filter) => {
                const selected = payoutStatusFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    onPress={() => {
                      setPayoutStatusFilter(filter.key);
                      setShowStatusMenu(false);
                    }}
                    style={[styles.statusOption, selected && { backgroundColor: colors.secondary, borderRadius: colors.radius }]}
                  >
                    <Text style={[styles.statusOptionText, { color: selected ? colors.primary : colors.foreground }]}>{filter.label}</Text>
                    {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Info note */}
        <View style={[styles.note, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.noteText, { color: colors.secondaryForeground }]}>
            Earnings are available after the service is completed and the customer payment is confirmed. Minimum withdrawal: ₹100.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryCard({ icon, label, value, colors, highlight }: any) {
  return (
    <View style={[
      styles.summaryCard,
      { backgroundColor: highlight ? colors.primary : colors.card, borderColor: colors.border, borderRadius: colors.radius },
    ]}>
      <Ionicons name={icon} size={20} color={highlight ? '#fff' : colors.primary} />
      <Text style={[styles.summaryValue, { color: highlight ? '#fff' : colors.foreground }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: highlight ? 'rgba(255,255,255,0.75)' : colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, padding: 12, alignItems: 'center', gap: 5, borderWidth: 1 },
  summaryValue: { fontSize: 16, fontWeight: '800' },
  summaryLabel: { fontSize: 10, textAlign: 'center' },
  balanceCard: { padding: 16, borderWidth: 1, gap: 12 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 12 },
  balanceValue: { fontSize: 26, fontWeight: '800', marginTop: 3 },
  balanceMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  balanceMetaText: { fontSize: 11 },
  chartCard: { padding: 16, borderWidth: 1, gap: 14 },
  chartTitle: { fontSize: 15, fontWeight: '700' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160 },
  barCol: { alignItems: 'center', flex: 1, gap: 4 },
  barTrack: { height: 120, justifyContent: 'flex-end', width: '70%' },
  bar: { width: '100%' },
  barVal: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  barDay: { fontSize: 10 },
  noData: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  noDataText: { fontSize: 13 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12 },
  noteText: { fontSize: 12, flex: 1, lineHeight: 17 },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  withdrawBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  payoutCard: { borderWidth: 2, padding: 16, gap: 12 },
  payoutTitle: { fontSize: 16, fontWeight: '700' },
  payoutSub: { fontSize: 12, marginTop: -6 },
  payoutRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  payoutCurr: { fontSize: 22, fontWeight: '800' },
  payoutInput: { flex: 1, padding: 12, fontSize: 18, fontWeight: '700' },
  payoutNoteInput: { padding: 12, fontSize: 14 },
  payoutBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  payoutCancel: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  payoutCancelText: { fontSize: 14, fontWeight: '600' },
  payoutSubmit: { flex: 2, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  payoutSubmitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  historyCard: { borderWidth: 1, overflow: 'hidden' },
  historyHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyTitle: { fontSize: 16, fontWeight: '700' },
  historySub: { fontSize: 12, marginTop: 3 },
  historyFilter: { padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderBottomWidth: 1 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderRadius: 999 },
  filterChipText: { fontSize: 11, fontWeight: '700' },
  historyLoading: { paddingVertical: 28, alignItems: 'center' },
  historyEmpty: { paddingVertical: 28, alignItems: 'center', gap: 8 },
  historyEmptyText: { fontSize: 13 },
  payoutHistoryRow: { borderTopWidth: 1, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  payoutHistoryMain: { flex: 1, gap: 3 },
  payoutHistoryAmount: { fontSize: 16, fontWeight: '800' },
  payoutHistoryDate: { fontSize: 11 },
  payoutHistoryNote: { fontSize: 11 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  calendarModal: { width: '100%', maxWidth: 380, padding: 18, borderWidth: 1 },
  calendarModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  calendarModalTitle: { fontSize: 17, fontWeight: '800' },
  closeButton: { padding: 2 },
  rangeSelectionRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  rangeSelection: { flex: 1, padding: 10, borderWidth: 1, borderRadius: 10, gap: 3 },
  rangeSelectionLabel: { fontSize: 10, fontWeight: '600' },
  rangeSelectionValue: { fontSize: 12, fontWeight: '700' },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
  monthButton: { padding: 8 },
  monthTitle: { fontSize: 15, fontWeight: '700' },
  weekHeader: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { width: '14.2857%', textAlign: 'center', fontSize: 11, fontWeight: '700' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calendarDayText: { fontSize: 13, fontWeight: '600' },
  calendarTodayButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, marginTop: 14 },
  calendarTodayText: { fontSize: 13, fontWeight: '700' },
  statusMenu: { width: '100%', maxWidth: 340, padding: 18, borderWidth: 1 },
  statusOption: { minHeight: 44, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  statusOptionText: { fontSize: 14, fontWeight: '600' },
});
