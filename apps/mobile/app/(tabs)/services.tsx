import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { categoriesApi, subcategoriesApi, professionalsApi, favoritesApi, servicesApi, cartApi, type Cart } from '@/lib/api';
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
  const [cartOpen, setCartOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

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

  // Always fetch professionals for the selected category (or all categories if none selected).
  // Sub-category filters down further once one is chosen.
  const canFetchPros = true;

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
  const { data: catalogue, isLoading: catalogueLoading } = useQuery({
    queryKey: ['/api/services', selectedCat, selectedSubCat, search],
    queryFn: () => servicesApi.list({
      ...(selectedCat ? { categoryId: selectedCat } : {}),
      ...(selectedSubCat ? { subCategoryId: selectedSubCat } : {}),
      ...(search.trim() ? { q: search.trim() } : {}),
    }),
  });
  const { data: cart } = useQuery({
    queryKey: ['/api/cart', accessToken],
    queryFn: () => cartApi.get(accessToken!),
    enabled: !!accessToken,
  });
  const cartMutation = useMutation({
    mutationFn: (serviceId: string) => cartApi.add(serviceId, 1, accessToken!),
    onSuccess: (next) => { queryClient.setQueryData(['/api/cart', accessToken], next); setCartOpen(true); },
  });
  const cartUpdateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      quantity > 0 ? cartApi.update(itemId, quantity, accessToken!) : cartApi.remove(itemId, accessToken!),
    onSuccess: (next) => queryClient.setQueryData(['/api/cart', accessToken], next),
  });
  const checkoutMutation = useMutation({
    mutationFn: () => cartApi.checkout({ scheduledAt: new Date(scheduledAt).toISOString() }, accessToken!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/cart', accessToken] }); setCartOpen(false); setScheduledAt(''); },
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

      
      {cartOpen && cart && (
        <View style={[styles.cartPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your cart · ₹{cart.total}</Text>
            <TouchableOpacity onPress={() => setCartOpen(false)}><Ionicons name="close" size={18} color={colors.mutedForeground} /></TouchableOpacity>
          </View>
          {cart.items.map((item) => (
            <View key={item.id} style={styles.cartRow}>
              <Text style={[styles.serviceName, { color: colors.foreground, flex: 1 }]}>{item.name}</Text>
              <TouchableOpacity onPress={() => cartUpdateMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 })}><Text style={{ color: colors.primary, fontSize: 20 }}>−</Text></TouchableOpacity>
              <Text style={{ color: colors.foreground, marginHorizontal: 10 }}>{item.quantity}</Text>
              <TouchableOpacity onPress={() => cartUpdateMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })}><Text style={{ color: colors.primary, fontSize: 20 }}>+</Text></TouchableOpacity>
            </View>
          ))}
          {cart.items.length > 0 && (
            <>
              <TextInput value={scheduledAt} onChangeText={setScheduledAt} placeholder="2026-08-01T10:00" placeholderTextColor={colors.mutedForeground} style={[styles.scheduleInput, { color: colors.foreground, backgroundColor: colors.muted }]} />
              <TouchableOpacity disabled={!scheduledAt || checkoutMutation.isPending} onPress={() => checkoutMutation.mutate()} style={[styles.checkoutButton, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>{checkoutMutation.isPending ? 'Confirming…' : 'Confirm booking'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
      {/* Customer catalog is the source of truth; products are admin-managed. */}
      <FlatList
        data={catalogue?.services ?? []}
        keyExtractor={(service) => service.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          catalogueLoading ? (
            <>{[0, 1, 2, 3].map((i) => <ProCardShimmer key={i} />)}</>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No services found</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try a different search or category</Text>
            </View>
          )
        }
        ListHeaderComponent={
          catalogue?.services?.length ? (
            <View style={[styles.sectionHeader, { marginBottom: 16 }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Available Services</Text>
              <TouchableOpacity onPress={() => setCartOpen(true)} disabled={!accessToken}>
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>
                  Cart{cart?.items.length ? ` (${cart.items.reduce((sum, item) => sum + item.quantity, 0)})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item: service }) => (
          <View style={[styles.catalogCard, { backgroundColor: colors.card, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }]}>
            <View style={styles.catalogImageWrapper}>
              {service.images?.[0] ? (
                <Image source={{ uri: service.images[0] }} style={styles.catalogImage} />
              ) : (
                <View style={[styles.catalogImage, { backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="sparkles" size={24} color="#C4B5FD" />
                </View>
              )}
              {service.badge && (
                <View style={styles.catalogBadgeContainer}>
                  <Text style={styles.catalogBadgeText}>{service.badge}</Text>
                </View>
              )}
            </View>
            <View style={styles.catalogContent}>
              <View>
                <Text numberOfLines={2} style={[styles.catalogName, { color: colors.foreground }]}>{service.name}</Text>
                <Text numberOfLines={1} style={[styles.catalogDescription, { color: colors.mutedForeground }]}>{service.description || 'Professional service'}</Text>
              </View>
              <View style={styles.catalogFooter}>
                <View>
                  <Text style={[styles.catalogPrice, { color: colors.foreground }]}>₹{service.customerPrice}</Text>
                  <Text style={[styles.catalogDuration, { color: colors.mutedForeground }]}>
                    <Ionicons name="time-outline" size={10} color={colors.mutedForeground} /> {service.duration} min
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => accessToken && cartMutation.mutate(service.id)}
                  disabled={!accessToken}
                  activeOpacity={0.8}
                  style={[styles.catalogAddBtn, { backgroundColor: accessToken ? '#5B3EF5' : colors.muted }]}
                >
                  <Text style={[styles.catalogAddBtnText, { color: accessToken ? '#fff' : colors.mutedForeground }]}>
                    {accessToken ? '+ Add' : 'Sign in'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  serviceSection: { padding: 16, borderBottomWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  serviceName: { fontSize: 14, fontWeight: '600' },
  addButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  cartPanel: { margin: 12, padding: 14, borderWidth: 1, borderRadius: 16 },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  scheduleInput: { padding: 10, borderRadius: 10, marginTop: 8 },
  checkoutButton: { padding: 12, borderRadius: 10, marginTop: 8 },
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
  catalogCard: { flexDirection: 'row', gap: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderRadius: 16 },
  catalogImageWrapper: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden' },
  catalogImage: { width: '100%', height: '100%' },
  catalogBadgeContainer: { position: 'absolute', top: 0, left: 0, backgroundColor: '#5B3EF5', paddingHorizontal: 6, paddingVertical: 4, borderBottomRightRadius: 8 },
  catalogBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  catalogContent: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
  catalogName: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  catalogDescription: { fontSize: 12, marginTop: 4 },
  catalogFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  catalogPrice: { fontSize: 16, fontWeight: '800' },
  catalogDuration: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  catalogAddBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  catalogAddBtnText: { fontSize: 13, fontWeight: '700' },
});


