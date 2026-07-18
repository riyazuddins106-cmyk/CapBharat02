import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { subcategoriesApi, professionalsApi, favoritesApi } from '@/lib/api';
import { ProCard } from '@/components/ProCard';
import { ProCardShimmer } from '@/components/Shimmer';
import { queryClient } from '@/lib/queryClient';

// ── Icon mapping ────────────────────────────────────────────
const SUBCAT_ICONS: Array<[string, keyof typeof MaterialCommunityIcons.glyphMap]> = [
  // ── Cleaning ──────────────────────────────────────────────────────
  ['home deep', 'home-heart'], ['full home', 'home-heart'], ['home clean', 'home'],
  ['bathroom', 'shower-head'], ['toilet clean', 'shower-head'],
  ['kitchen', 'silverware-fork-knife'], ['chimney', 'silverware-fork-knife'], ['stove', 'stove'],
  ['sofa', 'sofa'], ['carpet', 'rug'], ['upholstery', 'sofa'],
  ['move-in', 'truck-delivery'], ['move-out', 'truck-delivery'], ['move in', 'truck-delivery'], ['move out', 'truck-delivery'], ['handover', 'truck-delivery'],
  ['office clean', 'office-building'], ['commercial clean', 'office-building'],
  ['curtain', 'curtains'], ['window', 'window-maximize'],
  ['shoe', 'shoe-sneaker'], ['footwear', 'shoe-sneaker'],
  // ── Plumbing ──────────────────────────────────────────────────────
  ['pipe leak', 'pipe-wrench'], ['pipe repair', 'pipe-wrench'], ['burst pipe', 'pipe-wrench'],
  ['pipe install', 'pipe'], ['pipeline', 'pipe'],
  ['tap', 'water-pump'], ['faucet', 'water-pump'], ['mixer', 'water-pump'],
  ['toilet', 'toilet'], ['flush', 'toilet'], ['cistern', 'toilet'],
  ['geyser', 'thermometer'], ['water heater', 'thermometer'], ['boiler', 'thermometer'],
  ['drain', 'pipe'], ['blockage', 'pipe'], ['clog', 'pipe'], ['sewer', 'pipe'],
  // ── Electrical ────────────────────────────────────────────────────
  ['wiring', 'lightning-bolt'], ['rewiring', 'lightning-bolt'], ['short circuit', 'lightning-bolt'],
  ['fan', 'fan'], ['light fitting', 'lightbulb-on'], ['led', 'lightbulb-on'], ['chandelier', 'lightbulb-on'],
  ['switch', 'toggle-switch'], ['socket', 'power-socket'], ['switchboard', 'toggle-switch'],
  ['mcb', 'fuse'], ['fuse', 'fuse'], ['earthing', 'lightning-bolt-circle'],
  ['cctv', 'cctv'], ['surveillance', 'cctv'],
  ['inverter', 'battery-charging'], ['battery', 'battery-charging'], ['ups', 'battery-charging'],
  // ── Salon ─────────────────────────────────────────────────────────
  ['haircut', 'content-cut'], ['hair cut', 'content-cut'], ['hair style', 'content-cut'], ['barber', 'content-cut'],
  ['hair spa', 'hair-dryer'], ['hair colour', 'hair-dryer'], ['hair color', 'hair-dryer'], ['blow-dry', 'hair-dryer'],
  ['facial', 'face-woman'], ['skincare', 'face-woman'], ['skin care', 'face-woman'], ['clean-up', 'face-woman'],
  ['bridal', 'palette'], ['makeup', 'palette'], ['bride', 'palette'],
  ['nail', 'hand-clap'], ['manicure', 'hand-clap'], ['pedicure', 'hand-clap'],
  ['wax', 'content-cut'], ['threading', 'content-cut'],
  ['spa', 'hand-heart'], ['massage', 'hand-heart'],
  // ── Painting ──────────────────────────────────────────────────────
  ['interior paint', 'format-paint'], ['interior painting', 'format-paint'], ['wall paint', 'format-paint'], ['room paint', 'format-paint'],
  ['exterior paint', 'format-paint'], ['exterior painting', 'format-paint'], ['facade', 'format-paint'],
  ['texture', 'brush-variant'], ['design paint', 'brush-variant'], ['wall art', 'brush-variant'],
  ['putty', 'format-paint'], ['primer', 'format-paint'], ['wall putty', 'format-paint'],
  ['wood polish', 'brush'], ['varnish', 'brush'], ['lacquer', 'brush'], ['polish', 'brush'],
  ['waterproof', 'water'], ['damp', 'water'], ['seepage', 'water'],
  ['paint', 'format-paint'],
  // ── AC & Appliances ───────────────────────────────────────────────
  ['ac service', 'air-conditioner'], ['ac clean', 'air-conditioner'], ['ac maintenance', 'air-conditioner'],
  ['ac gas', 'air-conditioner'], ['ac install', 'air-conditioner'], ['ac repair', 'wrench'],
  ['ac', 'air-conditioner'],
  ['refrigerator', 'fridge'], ['fridge', 'fridge'], ['freezer', 'fridge'],
  ['washing machine', 'washing-machine'], ['washer repair', 'washing-machine'],
  // ── Laundry ───────────────────────────────────────────────────────
  ['wash & fold', 'washing-machine'], ['wash and fold', 'washing-machine'],
  ['dry clean', 'tshirt-crew'], ['dryclean', 'tshirt-crew'],
  ['iron', 'iron'], ['ironing', 'iron'], ['press cloth', 'iron'], ['pressing', 'iron'],
  ['stain', 'water-alert'], ['spot clean', 'water-alert'],
  // ── General ───────────────────────────────────────────────────────
  ['office', 'office-building'], ['deep clean', 'spray-bottle'],
  ['vehicle', 'car-wash'], ['car wash', 'car-wash'],
  ['pest', 'bug'], ['garden', 'flower'], ['furniture', 'table-furniture'],
  ['utensil', 'silverware-clean'], ['light', 'lightbulb-on'],
];
function getIcon(name: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const lower = name.toLowerCase();
  for (const [key, icon] of SUBCAT_ICONS) { if (lower.includes(key)) return icon; }
  return 'tag-outline';
}
const ACCENTS = ['#5B3EF5','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316','#06B6D4'];

// ── Helpers ─────────────────────────────────────────────────
/** Returns true only for real uploaded images — excludes placeholder SVGs */
const hasRealImage = (url?: string | null) => !!url && !url.includes('placeholder');

// ── ALL tile sentinel ───────────────────────────────────────
const ALL_ID = '__all__';

export default function SubcategoriesScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { categoryId, categoryName } = useLocalSearchParams<{ categoryId: string; categoryName?: string }>();

  const [selectedSubCat, setSelectedSubCat] = useState<string>(ALL_ID); // ALL_ID = no filter
  const [search, setSearch] = useState('');
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  // ── Sub-categories ──────────────────────────────────────
  const { data: subcategories, isLoading: subcatsLoading } = useQuery({
    queryKey: ['/api/categories', categoryId, 'subcategories'],
    queryFn: () => subcategoriesApi.listByCategory(categoryId),
    enabled: !!categoryId,
    staleTime: 30_000,
  });

  // ── Professionals filtered by selection ─────────────────
  const { data: professionals, isLoading: prosLoading } = useQuery({
    queryKey: ['/api/professionals', categoryId, selectedSubCat, search],
    queryFn: () => professionalsApi.list({
      categoryId,
      ...(selectedSubCat !== ALL_ID ? { subCategoryId: selectedSubCat } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    enabled: !!categoryId,
    staleTime: 15_000,
  });

  // ── Favorites ───────────────────────────────────────────
  const { data: favorites } = useQuery({
    queryKey: ['/api/favorites', accessToken],
    queryFn: () => favoritesApi.list(accessToken!),
    enabled: !!accessToken,
  });
  const favoriteIds = new Set((favorites ?? []).map((f: any) => f.professionalId ?? f.id));
  const favMutation = useMutation({
    mutationFn: (proId: string) => favoritesApi.toggle(proId, accessToken!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/favorites'] }),
  });

  // Build tile list: "All" first, then real sub-cats
  // Use the first subcategory's color for "All" so it always matches the palette
  const paletteColor = subcategories?.[0]?.color || '#5B3EF5';
  const tiles = useMemo(() => {
    const all = [{ id: ALL_ID, name: 'All', color: paletteColor, iconColor: '#fff' }];
    if (!subcategories) return all;
    return [...all, ...subcategories];
  }, [subcategories, paletteColor]);

  // Sub-category section label
  const selectedLabel = selectedSubCat === ALL_ID
    ? 'All Professionals'
    : (subcategories?.find(s => s.id === selectedSubCat)?.name ?? '') + ' Professionals';

  // ── Header component for FlatList ───────────────────────
  const ListHeader = (
    <View>
      {/* ── Sub-category grid ── */}
      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
        {categoryName ? `${categoryName} — Pick a Service Type` : 'Pick a Service Type'}
      </Text>

      <View style={styles.tileGrid}>
        {subcatsLoading
          ? Array(8).fill(0).map((_, i) => (
              <View key={i} style={styles.tileWrap}>
                <View style={[styles.tileIcon, { backgroundColor: colors.border }]} />
                <View style={[styles.tileLabelPh, { backgroundColor: colors.border }]} />
              </View>
            ))
          : tiles.map((item, index) => {
              const isAll = item.id === ALL_ID;
              const isSelected = selectedSubCat === item.id;
              const accent = isAll ? colors.primary : (item.color || ACCENTS[(index - 1) % ACCENTS.length]);
              const iconName: keyof typeof MaterialCommunityIcons.glyphMap = isAll
                ? 'view-grid'
                : ((item as any).iconName && (item as any).iconName !== 'tag-outline'
                    ? (item as any).iconName
                    : getIcon(item.name));
              const iconColor = isAll ? '#fff' : ((item as any).iconColor || '#fff');

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.tileWrap}
                  activeOpacity={0.75}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedSubCat(item.id);
                  }}
                >
                  <View style={[
                    styles.tileIcon,
                    { backgroundColor: hasRealImage((item as any).imageUrl) ? 'transparent' : accent },
                    isSelected && styles.tileIconSelected,
                  ]}>
                    {hasRealImage((item as any).imageUrl)
                      ? <Image source={{ uri: (item as any).imageUrl }} style={styles.tileImage} resizeMode="cover" />
                      : <MaterialCommunityIcons name={iconName} size={24} color={iconColor} />
                    }
                  </View>
                  <Text
                    style={[
                      styles.tileLabel,
                      { color: isSelected ? accent : colors.foreground },
                      isSelected && { fontWeight: '700' },
                    ]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
      </View>

      {/* ── Professionals section header ── */}
      <View style={[styles.proHeader, { borderTopColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.foreground, marginBottom: 0 }]}>
          {selectedLabel}
        </Text>
        {professionals && (
          <Text style={[styles.proCount, { color: colors.mutedForeground }]}>
            {professionals.length} found
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {categoryName ?? 'Services'}
          </Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search services or professionals..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} onPress={() => setSearch('')} />
          )}
        </View>
      </View>

      {/* ── Main list: sub-cat grid header + professionals ── */}
      <FlatList
        data={prosLoading ? [] : (professionals ?? [])}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          prosLoading ? (
            <View>{[0,1,2,3].map(i => <ProCardShimmer key={i} />)}</View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="person-outline" size={44} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No professionals found</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {search.trim() ? 'Try a different search term' : 'No professionals available in this category yet'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ProCard
            pro={item}
            onPress={() => router.push({ pathname: '/professional/[id]', params: { id: item.id } })}
            onBook={() => router.push({ pathname: '/professional/[id]', params: { id: item.id, openBook: '1' } })}
            isFavorite={favoriteIds.has(item.id)}
            onToggleFavorite={accessToken ? () => { Haptics.selectionAsync(); favMutation.mutate(item.id); } : undefined}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header:       { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 10 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:      { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  title:        { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  searchBar:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, gap: 8 },
  searchInput:  { flex: 1, fontSize: 13, padding: 0 },
  sectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  // 4-column tile grid
  tileGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tileWrap:     { width: '22%', alignItems: 'center', gap: 6, paddingVertical: 4 },
  tileIcon:     { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tileImage:    { width: 56, height: 56, borderRadius: 16 },
  tileIconSelected: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4, transform: [{ scale: 1.06 }] },
  tileLabel:    { fontSize: 11, fontWeight: '500', textAlign: 'center', lineHeight: 15 },
  tileLabelPh:  { width: '80%', height: 10, borderRadius: 4 },
  // Professionals section
  proHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 16, marginBottom: 12 },
  proCount:     { fontSize: 12 },
  // Empty state
  empty:        { alignItems: 'center', paddingTop: 32, gap: 8 },
  emptyTitle:   { fontSize: 16, fontWeight: '700' },
  emptyText:    { fontSize: 13, textAlign: 'center', maxWidth: 240, lineHeight: 18 },
});
