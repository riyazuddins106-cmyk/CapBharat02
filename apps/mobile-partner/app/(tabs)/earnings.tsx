import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { partnerApi } from '@/lib/api';

function fmtDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short' });
}

export default function EarningsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data: earnings, isLoading } = useQuery({
    queryKey: ['/api/partner/earnings', accessToken],
    queryFn: () => partnerApi.getEarnings(accessToken!),
    enabled: !!accessToken,
  });

  const weekly: { date: string; amount: number }[] = earnings?.weekly ?? [];
  const maxAmount = Math.max(...weekly.map((w) => w.amount), 1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Earnings</Text>
        <Text style={styles.headerSub}>Your income summary</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 32 }}>
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <SummaryCard icon="today-outline" label="Today" value={`₹${earnings?.today ?? 0}`} colors={colors} />
          <SummaryCard icon="calendar-outline" label="This Month" value={`₹${earnings?.thisMonth ?? 0}`} colors={colors} highlight />
          <SummaryCard icon="trophy-outline" label="All Time" value={`₹${earnings?.total ?? 0}`} colors={colors} />
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

        {/* Info note */}
        <View style={[styles.note, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.noteText, { color: colors.secondaryForeground }]}>
            Earnings are counted once a booking is marked as completed.
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
});
