import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { bookingsApi, reviewsApi, type Booking } from '@/lib/api';
import { BookingCard } from '@/components/BookingCard';
import { queryClient } from '@/lib/queryClient';

export default function BookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [reviewModal, setReviewModal] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['/api/bookings', accessToken],
    queryFn: () => bookingsApi.list(accessToken!),
    enabled: !!accessToken,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.cancel(id, accessToken!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () => reviewsApi.create({ bookingId: reviewModal!.id, rating, comment }, accessToken!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      setReviewModal(null);
      setComment('');
      setRating(5);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const UPCOMING = ['upcoming', 'in_progress'];
  const filtered = (bookings ?? []).filter((b) =>
    tab === 'upcoming' ? UPCOMING.includes(b.status) : !UPCOMING.includes(b.status),
  );

  if (!isAuthenticated) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPadding }]}>
        <Ionicons name="calendar-outline" size={56} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your bookings</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Sign in to view and manage your bookings</Text>
        <TouchableOpacity
          onPress={() => router.push('/auth')}
          style={[styles.signInBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          activeOpacity={0.85}
        >
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Bookings</Text>
        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.muted, borderRadius: 100 }]}>
          {(['upcoming', 'past'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, { backgroundColor: tab === t ? colors.card : 'transparent', borderRadius: 100 }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: tab === t ? colors.foreground : colors.mutedForeground, fontWeight: tab === t ? '700' : '500' }]}>
                {t === 'upcoming' ? 'Upcoming' : 'Past'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={44} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No {tab} bookings</Text>
              {tab === 'upcoming' && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/services')} style={[styles.signInBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
                  <Text style={styles.signInBtnText}>Browse Services</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onCancel={(id) => Alert.alert('Cancel Booking', 'Are you sure you want to cancel?', [
              { text: 'Keep', style: 'cancel' },
              { text: 'Cancel Booking', style: 'destructive', onPress: () => cancelMutation.mutate(id) },
            ])}
            onReview={(b) => setReviewModal(b)}
          />
        )}
      />

      {/* Review Modal */}
      <Modal visible={!!reviewModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalBackdrop}>
          <View style={[styles.reviewSheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.reviewHeader}>
              <Text style={[styles.reviewTitle, { color: colors.foreground }]}>Rate Your Experience</Text>
              <TouchableOpacity onPress={() => setReviewModal(null)}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.reviewPro, { color: colors.mutedForeground }]}>{reviewModal?.proName}</Text>

            {/* Star rating */}
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => { setRating(s); Haptics.selectionAsync(); }}>
                  <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={32} color={s <= rating ? '#FBBF24' : colors.border} />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Share your experience (optional)..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              style={[styles.reviewInput, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
            />

            <TouchableOpacity
              onPress={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
              style={[styles.reviewSubmit, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              activeOpacity={0.85}
            >
              <Text style={styles.reviewSubmitText}>
                {reviewMutation.isPending ? 'Submitting…' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  tabs: { flexDirection: 'row', padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabText: { fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  signInBtn: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  signInBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  reviewSheet: { margin: 16, padding: 24, gap: 16 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewTitle: { fontSize: 18, fontWeight: '700' },
  reviewPro: { fontSize: 13, marginTop: -8 },
  stars: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 8 },
  reviewInput: { padding: 12, fontSize: 14, textAlignVertical: 'top', minHeight: 80 },
  reviewSubmit: { paddingVertical: 14, alignItems: 'center' },
  reviewSubmitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
