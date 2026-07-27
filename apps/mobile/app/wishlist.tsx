import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { serviceWishlistApi, type WishlistedService } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

export default function WishlistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['/api/service-wishlist', accessToken],
    queryFn: () => serviceWishlistApi.list(accessToken!),
    enabled: !!accessToken,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => serviceWishlistApi.toggle(id, accessToken!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/service-wishlist'] });
    },
  });

  const fmtDuration = (mins: number) => mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins}m`;

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
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="heart-outline" size={52} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your wishlist is empty</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Heart a service to save it here</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/services')} style={[styles.browseBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
            <Text style={styles.browseBtnText}>Browse Services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
          renderItem={({ item: s }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              {/* Thumbnail */}
              {s.images?.[0] ? (
                <Image source={{ uri: s.images[0] }} style={[styles.thumb, { borderRadius: colors.radius - 2 }]} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: colors.secondary, borderRadius: colors.radius - 2, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="construct-outline" size={26} color={colors.primary} />
                </View>
              )}

              {/* Info */}
              <View style={styles.info}>
                {s.badge && (
                  <View style={[styles.badgePill, { backgroundColor: colors.primary + '18' }]}>
                    <Text style={[styles.badgeText, { color: colors.primary }]}>{s.badge}</Text>
                  </View>
                )}
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>{s.name}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>{fmtDuration(s.duration)}</Text>
                  <Text style={[styles.price, { color: colors.primary }]}>₹{s.customerPrice}</Text>
                </View>
              </View>

              {/* Remove heart */}
              <TouchableOpacity
                onPress={() => toggleMutation.mutate(s.id)}
                style={styles.heartBtn}
                activeOpacity={0.7}
                disabled={toggleMutation.isPending}
              >
                <Ionicons name="heart" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  backBtn:     { padding: 4 },
  title:       { flex: 1, fontSize: 20, fontWeight: '700' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText:   { fontSize: 14, textAlign: 'center' },
  browseBtn:   { paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  browseBtnText:{ color: '#fff', fontWeight: '700' },
  card:        { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderWidth: 1 },
  thumb:       { width: 64, height: 64 },
  info:        { flex: 1, gap: 4 },
  badgePill:   { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  name:        { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta:        { fontSize: 12 },
  price:       { fontSize: 13, fontWeight: '700', marginLeft: 'auto' },
  heartBtn:    { padding: 8 },
});
