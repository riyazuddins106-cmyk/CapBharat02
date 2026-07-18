import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { subcategoriesApi } from '@/lib/api';

// ── Icon mapping for common sub-category names ─────────────
const SUBCAT_ICONS: Array<[string, keyof typeof MaterialCommunityIcons.glyphMap]> = [
  ['home deep', 'home-heart'],
  ['home clean', 'home'],
  ['kitchen', 'silverware-fork-knife'],
  ['bathroom', 'shower-head'],
  ['sofa', 'sofa'],
  ['carpet', 'rug'],
  ['window', 'window-maximize'],
  ['vehicle', 'car-wash'],
  ['car wash', 'car-wash'],
  ['office', 'office-building'],
  ['utensil', 'silverware-clean'],
  ['deep clean', 'spray-bottle'],
  ['pipe', 'pipe-wrench'],
  ['tap', 'water-pump'],
  ['toilet', 'toilet'],
  ['drain', 'pipe'],
  ['wiring', 'lightning-bolt'],
  ['fan', 'fan'],
  ['switch', 'toggle-switch'],
  ['light', 'lightbulb-on'],
  ['haircut', 'content-cut'],
  ['hair cut', 'content-cut'],
  ['facial', 'face-woman'],
  ['makeup', 'palette'],
  ['nail', 'hand-clap'],
  ['massage', 'hand-heart'],
  ['paint', 'format-paint'],
  ['waterproof', 'water'],
  ['ac', 'air-conditioner'],
  ['refrigerator', 'fridge'],
  ['washing', 'washing-machine'],
  ['iron', 'iron'],
  ['pest', 'bug'],
  ['garden', 'flower'],
  ['furniture', 'table-furniture'],
];

function getIcon(name: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const lower = name.toLowerCase();
  for (const [key, icon] of SUBCAT_ICONS) {
    if (lower.includes(key)) return icon;
  }
  return 'tag-outline';
}

const ACCENTS = ['#5B3EF5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4'];

export default function SubcategoriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { categoryId, categoryName } = useLocalSearchParams<{ categoryId: string; categoryName?: string }>();
  const [search, setSearch] = useState('');

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data: subcategories, isLoading } = useQuery({
    queryKey: ['/api/categories', categoryId, 'subcategories'],
    queryFn: () => subcategoriesApi.listByCategory(categoryId),
    enabled: !!categoryId,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    if (!subcategories) return [];
    if (!search.trim()) return subcategories;
    return subcategories.filter(s => s.name.toLowerCase().includes(search.toLowerCase().trim()));
  }, [subcategories, search]);

  const title = categoryName ? `${categoryName} Services` : 'Select Service';

  function handleSelect(sub: { id: string; name: string }) {
    Haptics.selectionAsync();
    router.push({
      pathname: '/(tabs)/services',
      params: {
        categoryId,
        categoryName: categoryName ?? '',
        subCategoryId: sub.id,
        subCategoryName: sub.name,
      },
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
          <View style={{ width: 38 }} />
        </View>
        {/* Search within subcategories */}
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search services..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} onPress={() => setSearch('')} />
          )}
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Choose a service type to see professionals
        </Text>
      </View>

      {/* Grid */}
      <FlatList
        data={isLoading ? (Array(6).fill(null) as null[]) : filtered}
        keyExtractor={(item, i) => item?.id ?? `sk-${i}`}
        numColumns={2}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
        columnWrapperStyle={{ gap: 12 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="grid-outline" size={52} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search.trim() ? 'No results' : 'No services yet'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {search.trim() ? 'Try a different search term' : 'Check back soon for more services'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          if (!item) {
            // Skeleton card
            return (
              <View style={[styles.card, { backgroundColor: colors.muted, flex: 1, borderColor: 'transparent' }]}>
                <View style={[styles.iconWrap, { backgroundColor: colors.border }]} />
                <View style={[styles.skLine, { backgroundColor: colors.border, width: '75%' }]} />
                <View style={[styles.skLine, { backgroundColor: colors.border, width: '55%', height: 10, marginTop: 2 }]} />
              </View>
            );
          }
          const accent = item.color || ACCENTS[index % ACCENTS.length];
          const iconName = (item.iconName && item.iconName !== 'tag-outline' ? item.iconName : getIcon(item.name)) as keyof typeof MaterialCommunityIcons.glyphMap;
          const iconColor = item.iconColor || '#ffffff';
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}
              activeOpacity={0.8}
              onPress={() => handleSelect(item)}
            >
              <View style={[styles.iconWrap, { backgroundColor: accent }]}>
                <MaterialCommunityIcons name={iconName} size={30} color={iconColor} />
              </View>
              <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={2}>{item.name}</Text>
              {item.description ? (
                <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.arrowRow}>
                <Ionicons name="arrow-forward-circle" size={20} color={item.color || accent} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: -2,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
    minHeight: 148,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  cardDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  arrowRow: {
    marginTop: 'auto',
    alignSelf: 'flex-end',
    paddingTop: 4,
  },
  skLine: {
    height: 13,
    borderRadius: 6,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 230,
    lineHeight: 18,
  },
});
