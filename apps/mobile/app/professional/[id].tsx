import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { professionalsApi, favoritesApi } from '@/lib/api';
import { ProCardShimmer } from '@/components/Shimmer';
import { queryClient } from '@/lib/queryClient';


export default function ProfessionalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken, isAuthenticated } = useAuth();

  const [isFav, setIsFav] = useState(false);

  const { data: pro, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/professionals', id],
    queryFn: () => professionalsApi.get(id),
    enabled: !!id,
  });

  // Sync initial favourite state from the user's favourites list
  const { data: favList } = useQuery({
    queryKey: ['/api/favorites', accessToken],
    queryFn: () => favoritesApi.list(accessToken!),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (favList) {
      setIsFav(favList.some((p) => p.id === id));
    }
  }, [favList, id]);

  const favMutation = useMutation({
    mutationFn: () => favoritesApi.toggle(id, accessToken!),
    onSuccess: (data) => setIsFav(data.isFavorite),
  });

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, paddingTop: topPad + 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <ProCardShimmer />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingTop: topPad + 8, paddingHorizontal: 16, paddingBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground, textAlign: 'center' }}>
            Couldn't load this professional
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

  if (!pro) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.heroNav, { paddingTop: topPad + 8 }]}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.navBtn, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
              <Ionicons name="arrow-back" size={20} color={colors.foreground} />
            </TouchableOpacity>
            {accessToken && (
              <TouchableOpacity onPress={() => favMutation.mutate()} style={[styles.navBtn, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
                <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? colors.destructive : colors.foreground} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.heroContent}>
            {pro.avatarUrl ? (
              <Image source={{ uri: pro.avatarUrl }} style={[styles.avatar, { borderRadius: colors.radius }]} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>{pro.name[0]}</Text>
              </View>
            )}
            <View style={styles.heroInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.foreground }]}>{pro.name}</Text>
                {pro.badge && (
                  <View style={[styles.badge, {
                    backgroundColor: pro.badge === 'Top Rated' ? '#5B3EF5' : pro.badge === 'New' ? '#16A34A' : colors.primary,
                  }]}>
                    <Text style={styles.badgeText}>{pro.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.proTitle, { color: colors.mutedForeground }]}>{pro.title}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#FBBF24" />
                <Text style={[styles.rating, { color: colors.foreground }]}>{pro.rating}</Text>
                <Text style={[styles.reviews, { color: colors.mutedForeground }]}>({pro.reviewCount} reviews)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Price */}
        <View style={[styles.priceBar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Starting at</Text>
          <Text style={[styles.price, { color: colors.primary }]}>₹{pro.basePrice}<Text style={styles.priceUnit}>{pro.priceUnit}</Text></Text>
        </View>

        {/* Tags */}
        {(pro.tags ?? []).length > 0 && (
          <View style={[styles.section, { paddingHorizontal: 16, marginTop: 16 }]}>
            <View style={styles.tags}>
              {(pro.tags ?? []).map((t) => (
                <View key={t} style={[styles.tag, { backgroundColor: colors.secondary, borderRadius: 100 }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bio */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
          <Text style={[styles.bio, { color: colors.mutedForeground }]}>{pro.bio}</Text>
        </View>

        {/* Reviews */}
        {(pro.reviews ?? []).length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginHorizontal: 16 }]}>Reviews</Text>
            {(pro.reviews ?? []).slice(0, 3).map((r) => (
              <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewStars}>
                    {[1,2,3,4,5].map((s) => (
                      <Ionicons key={s} name="star" size={12} color={s <= r.rating ? '#FBBF24' : colors.border} />
                    ))}
                  </View>
                  <Text style={[styles.reviewDate, { color: colors.mutedForeground }]}>
                    {new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                {r.comment && <Text style={[styles.reviewComment, { color: colors.foreground }]}>{r.comment}</Text>}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderBottomWidth: 1, paddingBottom: 20 },
  heroNav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroContent: { flexDirection: 'row', paddingHorizontal: 16, gap: 14 },
  avatar: { width: 88, height: 88 },
  avatarPlaceholder: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 36, fontWeight: '700' },
  heroInfo: { flex: 1, gap: 5, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 20, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  proTitle: { fontSize: 13 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontSize: 13, fontWeight: '700' },
  reviews: { fontSize: 12 },
  priceBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  priceLabel: { fontSize: 13 },
  price: { fontSize: 22, fontWeight: '800' },
  priceUnit: { fontSize: 14, fontWeight: '400' },
  section: {},
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontSize: 12, fontWeight: '600' },
  bio: { fontSize: 14, lineHeight: 22 },
  reviewCard: { padding: 14, marginBottom: 10, borderWidth: 1 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewDate: { fontSize: 11 },
  reviewComment: { fontSize: 13, lineHeight: 20 },
});
