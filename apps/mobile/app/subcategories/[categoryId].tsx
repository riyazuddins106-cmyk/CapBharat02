import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Platform,
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
  ['home deep', 'home-heart'], ['home clean', 'home'], ['kitchen', 'silverware-fork-knife'],
  ['bathroom', 'shower-head'], ['sofa', 'sofa'], ['carpet', 'rug'],
  ['window', 'window-maximize'], ['vehicle', 'car-wash'], ['car wash', 'car-wash'],
  ['office', 'office-building'], ['utensil', 'silverware-clean'], ['deep clean', 'spray-bottle'],
  ['pipe', 'pipe-wrench'], ['tap', 'water-pump'], ['toilet', 'toilet'], ['drain', 'pipe'],
  ['wiring', 'lightning-bolt'], ['fan', 'fan'], ['switch', 'toggle-switch'],
  ['light', 'lightbulb-on'], ['haircut', 'content-cut'], ['hair cut', 'content-cut'],
  ['facial', 'face-woman'], ['makeup', 'palette'], ['nail', 'hand-clap'],
  ['massage', 'hand-heart'], ['paint', 'format-paint'], ['waterproof', 'water'],
  ['ac', 'air-conditioner'], ['refrigerator', 'fridge'], ['washing', 'washing-machine'],
  ['iron', 'iron'], ['pest', 'bug'], ['garden', 'flower'], ['furniture', 'table-furniture'],
];
function getIcon(name: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const lower = name.toLowerCase();
  for (const [key, icon] of SUBCAT_ICONS) { if (lower.includes(key)) return icon; }
  return 'tag-outline';
}
const ACCENTS = ['#5B3EF5','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316','#06B6D4'];

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
  const tiles = useMemo(() => {
    const all = [{ id: ALL_ID, name: 'All', color: colors.primary, iconColor: '#fff' }];
    if (!subcategories) return all;
    return [...all, ...subcategories];
  }, [subcategories, colors.primary]);

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
                    { backgroundColor: accent },
                    isSelected && styles.tileIconSelected,
                  ]}>
                    <MaterialCommunityIcons name={iconName} size={24} color={iconColor} />
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
  tileIcon:     { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
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
