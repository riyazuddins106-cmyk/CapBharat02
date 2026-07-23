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
import { ProCardShimmer } from '@/components/Shimmer';
import { queryClient } from '@/lib/queryClient';

const serviceTypeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  all: 'grid-outline',
  cleaning: 'sparkles-outline',
  plumbing: 'water-outline',
  electrical: 'flash-outline',
  salon: 'cut-outline',
  painting: 'color-palette-outline',
  'ac repair': 'snow-outline',
  laundry: 'shirt-outline',
  appliance: 'home-outline',
  default: 'sparkles-outline',
};

function getServiceTypeIcon(name: string): keyof typeof Ionicons.glyphMap {
  const normalized = name.trim().toLowerCase();
  return serviceTypeIcons[normalized] ?? serviceTypeIcons.default;
}

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

  const availableCategories = (categories ?? []).filter((category) => category.serviceCount > 0);
  const selectedCategory = availableCategories.find((category) => category.id === selectedCat);
  const selectedCategoryName = selectedCategory?.name ?? params.categoryName ?? 'Services';

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

  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Visual service-type picker — keeps the first browse decision on one screen. */}
      <View style={[styles.serviceTypePicker, { paddingTop: topPadding + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.serviceTypeTitle, { color: colors.foreground }]}>
          {selectedCat ? `${selectedCategoryName} — Pick a Service Type` : 'Pick a Service Type'}
        </Text>

        <FlatList
          horizontal
          data={[{ id: null, name: 'All' } as any, ...availableCategories]}
          keyExtractor={(item) => item.id ?? 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabsContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`category-tab-${item.id ?? 'all'}`}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedCat(item.id);
                setSelectedSubCat(null);
              }}
              activeOpacity={0.85}
              style={[
                styles.categoryTab,
                {
                  backgroundColor: selectedCat === item.id ? colors.primary : colors.muted,
                  borderColor: selectedCat === item.id ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.categoryTabText, { color: selectedCat === item.id ? '#fff' : colors.mutedForeground }]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />

        {selectedCat && (
          <View style={styles.serviceTypeGrid}>
            <TouchableOpacity
              testID="service-type-all"
              onPress={() => { setSelectedSubCat(null); Haptics.selectionAsync(); }}
              activeOpacity={0.85}
              style={styles.serviceTypeTile}
            >
              <View style={[styles.serviceTypeIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="grid-outline" size={25} color="#fff" />
              </View>
              <Text numberOfLines={2} style={[styles.serviceTypeLabel, { color: selectedSubCat === null ? colors.primary : colors.foreground, fontWeight: selectedSubCat === null ? '700' : '500' }]}>
                All
              </Text>
            </TouchableOpacity>
            {(subcategories ?? []).map((item) => (
              <TouchableOpacity
                key={item.id}
                testID={`service-type-${item.id}`}
                onPress={() => { setSelectedSubCat(item.id); Haptics.selectionAsync(); }}
                activeOpacity={0.85}
                style={styles.serviceTypeTile}
              >
                <View style={[styles.serviceTypeIcon, { backgroundColor: colors.primary }]}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.serviceTypeImage} />
                  ) : (
                    <Ionicons name={getServiceTypeIcon(item.name)} size={25} color="#fff" />
                  )}
                </View>
                <Text numberOfLines={2} style={[styles.serviceTypeLabel, { color: selectedSubCat === item.id ? colors.primary : colors.foreground, fontWeight: selectedSubCat === item.id ? '700' : '500' }]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Search header */}
      <View style={[styles.header, { paddingTop: 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {params.subCategoryName ? params.subCategoryName : 'Find Services'}
          </Text>
          <TouchableOpacity
            testID="services-header-cart"
            onPress={() => accessToken ? router.push('/checkout') : router.push('/auth')}
            activeOpacity={0.8}
            style={[styles.headerCartButton, { backgroundColor: colors.muted }]}
          >
            <Ionicons name="cart-outline" size={21} color={colors.foreground} />
            <View style={[styles.headerCartBadge, { backgroundColor: colors.primary, borderColor: colors.card }]}>
              <Text style={styles.headerCartBadgeText}>{cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0}</Text>
            </View>
          </TouchableOpacity>
        </View>
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
            <TouchableOpacity
              onPress={() => { setCartOpen(false); router.push('/checkout'); }}
              style={[styles.checkoutButton, { backgroundColor: colors.primary, marginTop: 10 }]}
            >
              <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 15 }}>
                Proceed to Checkout →
              </Text>
            </TouchableOpacity>
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
  serviceTypePicker: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  serviceTypeTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  categoryTabsContent: { gap: 8, paddingBottom: 12 },
  categoryTab: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  categoryTabText: { fontSize: 12, fontWeight: '600' },
  serviceTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 2 },
  serviceTypeTile: { width: 72, alignItems: 'center', gap: 5 },
  serviceTypeIcon: { width: 62, height: 62, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  serviceTypeImage: { width: '100%', height: '100%' },
  serviceTypeLabel: { fontSize: 11, lineHeight: 14, textAlign: 'center' },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCartButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerCartBadge: { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  headerCartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', textAlign: 'center' },
  serviceSection: { padding: 16, borderBottomWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  serviceName: { fontSize: 14, fontWeight: '600' },
  addButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  cartPanel: { margin: 12, padding: 14, borderWidth: 1, borderRadius: 16 },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  checkoutButton: { padding: 14, borderRadius: 14, marginTop: 8 },
  title: { fontSize: 24, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
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


