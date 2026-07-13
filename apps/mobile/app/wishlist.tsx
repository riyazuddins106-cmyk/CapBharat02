import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { favoritesApi, type Professional } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

export default function WishlistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data: pros = [], isLoading } = useQuery({
    queryKey: ['/api/favorites', accessToken],
    queryFn: () => favoritesApi.list(accessToken!),
    enabled: !!accessToken,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => favoritesApi.toggle(id, accessToken!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Wishlist</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : pros.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="heart-outline" size={52} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your wishlist is empty</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Heart a professional to save them here</Text>
          <TouchableOpacity onPress={() => router.back()} style={[styles.browseBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
            <Text style={styles.browseBtnText}>Browse Professionals</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pros}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
          renderItem={({ item: p }) => (
            <TouchableOpacity
              onPress={() => router.push(`/professional/${p.id}` as any)}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
              activeOpacity={0.8}
            >
              {p.avatarUrl ? (
                <Image source={{ uri: p.avatarUrl }} style={[styles.avatar, { borderRadius: colors.radius }]} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.secondary, borderRadius: colors.radius, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={[styles.avatarInitial, { color: colors.primary }]}>{p.name[0]}</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={[styles.proName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                <Text style={[styles.proTitle, { color: colors.mutedForeground }]} numberOfLines={1}>{p.title}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#FBBF24" />
                  <Text style={[styles.rating, { color: colors.mutedForeground }]}>{p.rating.toFixed(1)} ({p.reviewCount})</Text>
                  <Text style={[styles.price, { color: colors.primary }]}>₹{p.basePrice}{p.priceUnit}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); toggleMutation.mutate(p.id); }}
                style={styles.heartBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="heart" size={22} color="#EF4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  backBtn:      { padding: 4 },
  title:        { flex: 1, fontSize: 20, fontWeight: '700' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText:    { fontSize: 14, textAlign: 'center' },
  browseBtn:    { paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  browseBtnText:{ color: '#fff', fontWeight: '700' },
  card:         { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderWidth: 1 },
  avatar:       { width: 60, height: 60 },
  avatarInitial:{ fontSize: 22, fontWeight: '700' },
  info:         { flex: 1, gap: 3 },
  proName:      { fontSize: 15, fontWeight: '700' },
  proTitle:     { fontSize: 13 },
  ratingRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating:       { fontSize: 12 },
  price:        { fontSize: 13, fontWeight: '700', marginLeft: 'auto' },
  heartBtn:     { padding: 8 },
});
