import React, { useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { categoriesApi, professionalsApi } from '@/lib/api';
import { ProCard } from '@/components/ProCard';
import { ProCardShimmer } from '@/components/Shimmer';

const CAT_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Cleaning: 'broom',
  Plumbing: 'pipe-wrench',
  Electrical: 'lightning-bolt',
  Salon: 'content-cut',
  Painting: 'format-paint',
  'AC Repair': 'air-conditioner',
  Laundry: 'washing-machine',
  More: 'dots-grid',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: categoriesApi.list,
  });

  const { data: professionals, isLoading: prosLoading, refetch } = useQuery({
    queryKey: ['/api/professionals'],
    queryFn: () => professionalsApi.list(),
  });

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const featured = professionals?.slice(0, 6) ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greeting()}</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {user ? user.fullName.split(' ')[0] : 'Guest'} 👋
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.muted }]}>
            <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Location */}
      <View style={[styles.locationBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Ionicons name="location-outline" size={14} color={colors.primary} />
        <Text style={[styles.locationText, { color: colors.foreground }]}>Mumbai, India</Text>
        <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
      </View>

      {/* Promo Banner */}
      <View style={[styles.banner, { backgroundColor: colors.primary, marginHorizontal: 16, marginTop: 16, borderRadius: colors.radius }]}>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTag}>LIMITED OFFER</Text>
          <Text style={styles.bannerTitle}>40% off{'\n'}your first booking</Text>
          <TouchableOpacity
            style={styles.bannerBtn}
            activeOpacity={0.85}
            onPress={() => { Haptics.selectionAsync(); router.push('/(tabs)/services'); }}
          >
            <Text style={[styles.bannerBtnText, { color: colors.primary }]}>Book Now</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bannerDecor}>
          <MaterialCommunityIcons name="home-search" size={80} color="rgba(255,255,255,0.15)" />
        </View>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Services</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/services')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>
        {catsLoading ? (
          <View style={styles.catGrid}>
            {Array(8).fill(0).map((_, i) => (
              <View key={i} style={[styles.catItem, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
                <View style={[styles.catIcon, { backgroundColor: colors.border }]} />
                <View style={[styles.catLabelPlaceholder, { backgroundColor: colors.border }]} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.catGrid}>
            {(categories ?? []).map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catItem, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border }]}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push({ pathname: '/(tabs)/services', params: { categoryId: cat.id, categoryName: cat.name } });
                }}
              >
                <View style={[styles.catIcon, { backgroundColor: cat.color }]}>
                  <MaterialCommunityIcons
                    name={CAT_ICONS[cat.name] ?? 'tools'}
                    size={22}
                    color={cat.iconColor}
                  />
                </View>
                <Text style={[styles.catLabel, { color: colors.foreground }]} numberOfLines={1}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Featured Professionals */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Professionals</Text>
        </View>
        {prosLoading ? (
          [0, 1, 2].map((i) => <ProCardShimmer key={i} />)
        ) : (
          featured.map((pro) => (
            <ProCard
              key={pro.id}
              pro={pro}
              onPress={() => router.push({ pathname: '/professional/[id]', params: { id: pro.id } })}
              onBook={() => router.push({ pathname: '/professional/[id]', params: { id: pro.id, openBook: '1' } })}
            />
          ))
        )}
      </View>

      {/* Trust badges */}
      <View style={[styles.trust, { backgroundColor: colors.card, marginHorizontal: 16, borderRadius: colors.radius, borderColor: colors.border }]}>
        {[
          { icon: 'shield-checkmark-outline', label: 'Verified Pros' },
          { icon: 'time-outline', label: 'On Time' },
          { icon: 'star-outline', label: '5-Star Rated' },
        ].map(({ icon, label }) => (
          <View key={label} style={styles.trustItem}>
            <Ionicons name={icon as any} size={22} color={colors.primary} />
            <Text style={[styles.trustLabel, { color: colors.foreground }]}>{label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  greeting: { fontSize: 13 },
  name: { fontSize: 22, fontWeight: '700', marginTop: 1 },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 38, height: 38, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  locationBar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  locationText: { fontSize: 13, fontWeight: '500' },
  banner: { padding: 20, overflow: 'hidden', flexDirection: 'row', minHeight: 120 },
  bannerContent: { flex: 1, gap: 8 },
  bannerTag: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  bannerTitle: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  bannerBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 },
  bannerBtnText: { fontSize: 13, fontWeight: '700' },
  bannerDecor: { position: 'absolute', right: -10, bottom: -10 },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catItem: { width: '22%', aspectRatio: 0.9, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  catIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  catLabelPlaceholder: { width: '70%', height: 10, borderRadius: 4 },
  trust: { flexDirection: 'row', justifyContent: 'space-around', padding: 16, marginTop: 24, borderWidth: 1 },
  trustItem: { alignItems: 'center', gap: 6 },
  trustLabel: { fontSize: 12, fontWeight: '600' },
});
