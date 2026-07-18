import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { categoriesApi, subcategoriesApi, professionalsApi, favoritesApi } from '@/lib/api';
import { ProCard } from '@/components/ProCard';
import { CategoryPill } from '@/components/CategoryPill';
import { ProCardShimmer, CategoryShimmer } from '@/components/Shimmer';
import { queryClient } from '@/lib/queryClient';

export default function ServicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    categoryId?: string;
    categoryName?: string;
    subCategoryId?: string;
    subCategoryName?: string;
  }>();
  const { accessToken } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(params.categoryId ?? null);
  const [selectedSubCat, setSelectedSubCat] = useState<string | null>(params.subCategoryId ?? null);

  // Keep selectedSubCat in sync when navigating back here with new params
  React.useEffect(() => {
    setSelectedCat(params.categoryId ?? null);
    setSelectedSubCat(params.subCategoryId ?? null);
  }, [params.categoryId, params.subCategoryId]);

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: categoriesApi.list,
  });

  const { data: subcategories } = useQuery({
    queryKey: ['/api/subcategories', selectedCat],
    queryFn: () => selectedCat ? subcategoriesApi.listByCategory(selectedCat) : Promise.resolve([]),
    enabled: !!selectedCat,
  });

  // Gate: if a category is selected but no subcategory yet, don't fetch professionals.
  // Exception: if the user is free-text searching (no category selected), fetch freely.
  const canFetchPros = !selectedCat || !!selectedSubCat || !!search.trim();

  const { data: professionals, isLoading } = useQuery({
    queryKey: ['/api/professionals', selectedCat, selectedSubCat, search],
    queryFn: () => professionalsApi.list({
      ...(selectedCat ? { categoryId: selectedCat } : {}),
      ...(selectedSubCat ? { subCategoryId: selectedSubCat } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    enabled: canFetchPros,
    staleTime: 10_000,
  });

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

  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Search header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {params.subCategoryName ? params.subCategoryName : 'Find Services'}
        </Text>
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search professionals..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} onPress={() => setSearch('')} />
          )}
        </View>
      </View>

      {/* Category filter */}
      <View style={[styles.catWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {!categories ? (
          <CategoryShimmer />
        ) : (
          <FlatList
            horizontal
            data={[{ id: null, name: 'All' } as any, ...(categories ?? [])]}
            keyExtractor={(item) => item.id ?? 'all'}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
            renderItem={({ item }) => (
              <CategoryPill
                label={item.name}
                selected={selectedCat === item.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedCat(item.id);
                  setSelectedSubCat(null);
                }}
              />
            )}
          />
        )}
      </View>

      {/* Breadcrumb: category › sub-category */}
      {selectedCat && params.subCategoryName && (
        <View style={[styles.breadcrumb, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={[styles.breadcrumbText, { color: colors.mutedForeground }]}>
            {params.categoryName}
          </Text>
          <Ionicons name="chevron-forward" size={13} color={colors.mutedForeground} />
          <Text style={[styles.breadcrumbText, { color: colors.foreground, fontWeight: '700' }]}>
            {params.subCategoryName}
          </Text>
        </View>
      )}

      {/* Subcategory chips — shown when category is selected via pill but no subcat picked yet */}
      {selectedCat && !selectedSubCat && (subcategories?.length ?? 0) > 0 && (
        <View style={[styles.subCatWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <FlatList
            horizontal
            data={subcategories ?? []}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { setSelectedSubCat(item.id); Haptics.selectionAsync(); }}
                style={[styles.subCatChip, {
                  backgroundColor: colors.primary,
                  borderRadius: (colors.radius ?? 8) - 2,
                }]}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Prompt: category selected but no sub-category chosen yet */}
      {selectedCat && !selectedSubCat && !search.trim() ? (
        <View style={styles.pickSubCatPrompt}>
          <Ionicons name="grid-outline" size={44} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Choose a service type</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Select a sub-category above to see professionals
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backToCatBtn, { backgroundColor: colors.primary + '18', borderRadius: colors.radius }]}
          >
            <Ionicons name="arrow-back" size={14} color={colors.primary} />
            <Text style={[styles.backToCatText, { color: colors.primary }]}>Back to categories</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Results */
        <FlatList
          data={isLoading ? [] : (professionals ?? [])}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isLoading ? (
              <>{[0, 1, 2, 3].map((i) => <ProCardShimmer key={i} />)}</>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No professionals found</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try a different search or category</Text>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  title: { fontSize: 24, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  catWrap: { borderBottomWidth: 1 },
  subCatWrap: { borderBottomWidth: 1 },
  subCatChip: { paddingHorizontal: 12, paddingVertical: 6 },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 6,
  },
  breadcrumbText: { fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyText: { fontSize: 13 },
  pickSubCatPrompt: { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: 32 },
  backToCatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, marginTop: 8 },
  backToCatText: { fontSize: 13, fontWeight: '600' },
});
