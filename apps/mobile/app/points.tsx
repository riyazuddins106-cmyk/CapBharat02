import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { pointsApi, type PointsLedgerEntry } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

const TYPE_ICON: Record<string, string> = {
  earn: 'add-circle-outline',
  redeem: 'gift-outline',
  adjust: 'construct-outline',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PointsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [redeemModal, setRedeemModal] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');

  const { data: summary, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['/api/points', accessToken],
    queryFn: () => pointsApi.getSummary(accessToken!),
    enabled: !!accessToken,
  });

  const redeemMutation = useMutation({
    mutationFn: (points: number) => pointsApi.redeem(points, accessToken!),
    onSuccess: (res) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/points'] });
      setRedeemModal(false);
      setRedeemAmount('');
      Alert.alert('Redeemed!', `You redeemed points worth ₹${res.redeemedValue}. New balance: ${res.balance} points.`);
    },
    onError: (e: any) => Alert.alert('Could not redeem', e.message ?? 'Something went wrong.'),
  });

  const items: PointsLedgerEntry[] = summary?.history ?? [];
  const canRedeem = (summary?.balance ?? 0) >= (summary?.minRedeemPoints ?? 100);

  const submitRedeem = () => {
    const points = parseInt(redeemAmount, 10);
    if (!points || points < (summary?.minRedeemPoints ?? 100)) {
      Alert.alert('Invalid amount', `Enter at least ${summary?.minRedeemPoints ?? 100} points.`);
      return;
    }
    if (points > (summary?.balance ?? 0)) {
      Alert.alert('Not enough points', `You only have ${summary?.balance} points.`);
      return;
    }
    redeemMutation.mutate(points);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Points & Rewards</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          ListHeaderComponent={
            <View style={[styles.balanceCard, { backgroundColor: colors.primary, borderRadius: colors.radius * 2 }]}>
              <Text style={styles.balanceLabel}>Your balance</Text>
              <Text style={styles.balanceValue}>{summary?.balance ?? 0} pts</Text>
              <Text style={styles.balanceSub}>≈ ₹{summary?.redeemableValue ?? 0} redeemable · {summary?.earnRate}</Text>
              <TouchableOpacity
                disabled={!canRedeem}
                onPress={() => setRedeemModal(true)}
                style={[styles.redeemBtn, { opacity: canRedeem ? 1 : 0.5 }]}
                activeOpacity={0.85}
              >
                <Ionicons name="gift" size={16} color={colors.primary} />
                <Text style={[styles.redeemBtnText, { color: colors.primary }]}>Redeem Points</Text>
              </TouchableOpacity>
              {!canRedeem && (
                <Text style={styles.balanceSub}>Minimum {summary?.minRedeemPoints ?? 100} points needed to redeem</Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="sparkles-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No activity yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Complete a booking to start earning points</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.item, { borderBottomColor: colors.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                <Ionicons name={(TYPE_ICON[item.type] ?? 'ellipse-outline') as any} size={18} color={colors.primary} />
              </View>
              <View style={styles.itemContent}>
                <Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.description}</Text>
                <Text style={[styles.itemTime, { color: colors.mutedForeground }]}>{fmtDate(item.createdAt)}</Text>
              </View>
              <Text style={[styles.itemPoints, { color: item.points > 0 ? '#16A34A' : colors.foreground }]}>
                {item.points > 0 ? '+' : ''}{item.points}
              </Text>
            </View>
          )}
        />
      )}

      <Modal visible={redeemModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalBackdrop}>
          <View style={[styles.redeemSheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.reviewHeader}>
              <Text style={[styles.reviewTitle, { color: colors.foreground }]}>Redeem Points</Text>
              <TouchableOpacity onPress={() => setRedeemModal(false)}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.itemTime, { color: colors.mutedForeground }]}>
              Balance: {summary?.balance ?? 0} pts · 1 point = ₹1
            </Text>
            <TextInput
              value={redeemAmount}
              onChangeText={setRedeemAmount}
              placeholder={`Min ${summary?.minRedeemPoints ?? 100} points`}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
            />
            <TouchableOpacity
              onPress={submitRedeem}
              disabled={redeemMutation.isPending}
              style={[styles.reviewSubmit, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              activeOpacity={0.85}
            >
              <Text style={styles.reviewSubmitText}>{redeemMutation.isPending ? 'Redeeming…' : 'Confirm Redeem'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  backBtn:     { padding: 4 },
  title:       { flex: 1, fontSize: 20, fontWeight: '700' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle:  { fontSize: 18, fontWeight: '700' },
  emptyText:   { fontSize: 14, textAlign: 'center' },
  balanceCard: { margin: 16, padding: 20, gap: 4 },
  balanceLabel:{ color: '#fff', opacity: 0.85, fontSize: 13, fontWeight: '600' },
  balanceValue:{ color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 2 },
  balanceSub:  { color: '#fff', opacity: 0.85, fontSize: 12, marginTop: 2 },
  redeemBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 100, paddingVertical: 10, marginTop: 14 },
  redeemBtnText:{ fontSize: 14, fontWeight: '700' },
  item:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1 },
  iconWrap:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemContent: { flex: 1, gap: 2 },
  itemTitle:   { fontSize: 14, fontWeight: '500' },
  itemTime:    { fontSize: 12 },
  itemPoints:  { fontSize: 15, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  redeemSheet: { margin: 16, padding: 24, gap: 16 },
  reviewHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewTitle: { fontSize: 18, fontWeight: '700' },
  input:       { padding: 12, fontSize: 14 },
  reviewSubmit:{ paddingVertical: 14, alignItems: 'center' },
  reviewSubmitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
