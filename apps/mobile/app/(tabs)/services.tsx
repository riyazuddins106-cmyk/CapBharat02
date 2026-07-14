import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { categoriesApi, professionalsApi, favoritesApi } from '@/lib/api';
import { ProCard } from '@/components/ProCard';
import { CategoryPill } from '@/components/CategoryPill';
import { ProCardShimmer, CategoryShimmer } from '@/components/Shimmer';
import { queryClient } from '@/lib/queryClient';

export default function ServicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ categoryId?: string; categoryName?: string }>();
  const { accessToken } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(params.categoryId ?? null);

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: categoriesApi.list,
  });

  const { data: professionals, isLoading } = useQuery({
    queryKey: ['/api/professionals', selectedCat, search],
    queryFn: () => professionalsApi.list({
      ...(selectedCat ? { categoryId: selectedCat } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
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
        <Text style={[styles.title, { color: colors.foreground }]}>Find Services</Text>
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
                }}
              />
            )}
          />
        )}
      </View>

      {/* Results */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  title: { fontSize: 24, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  catWrap: { borderBottomWidth: 1 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyText: { fontSize: 13 },
});
