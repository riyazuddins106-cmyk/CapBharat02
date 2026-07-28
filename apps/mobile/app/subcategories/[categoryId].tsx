import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Platform, Image, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { subcategoriesApi, servicesApi, cartApi } from '@/lib/api';
import type { Service, Cart } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { CartAccess } from '@/components/CartAccess';

// ── Icon mapping ─────────────────────────────────────────────
const SUBCAT_ICONS: Array<[string, keyof typeof MaterialCommunityIcons.glyphMap]> = [
  ['home deep', 'home-heart'], ['full home', 'home-heart'], ['home clean', 'home'],
  ['bathroom', 'shower-head'], ['toilet clean', 'shower-head'],
  ['kitchen', 'silverware-fork-knife'], ['chimney', 'silverware-fork-knife'], ['stove', 'stove'],
  ['sofa', 'sofa'], ['carpet', 'rug'], ['upholstery', 'sofa'],
  ['move-in', 'truck-delivery'], ['move-out', 'truck-delivery'], ['move in', 'truck-delivery'], ['move out', 'truck-delivery'], ['handover', 'truck-delivery'],
  ['office clean', 'office-building'], ['commercial clean', 'office-building'],
  ['curtain', 'curtains'], ['window', 'window-maximize'],
  ['shoe', 'shoe-sneaker'], ['footwear', 'shoe-sneaker'],
  ['pipe leak', 'pipe-wrench'], ['pipe repair', 'pipe-wrench'], ['burst pipe', 'pipe-wrench'],
  ['pipe install', 'pipe'], ['pipeline', 'pipe'],
  ['tap', 'water-pump'], ['faucet', 'water-pump'], ['mixer', 'water-pump'],
  ['toilet', 'toilet'], ['flush', 'toilet'], ['cistern', 'toilet'],
  ['geyser', 'thermometer'], ['water heater', 'thermometer'], ['boiler', 'thermometer'],
  ['drain', 'pipe'], ['blockage', 'pipe'], ['clog', 'pipe'], ['sewer', 'pipe'],
  ['wiring', 'lightning-bolt'], ['rewiring', 'lightning-bolt'], ['short circuit', 'lightning-bolt'],
  ['fan', 'fan'], ['light fitting', 'lightbulb-on'], ['led', 'lightbulb-on'], ['chandelier', 'lightbulb-on'],
  ['switch', 'toggle-switch'], ['socket', 'power-socket'], ['switchboard', 'toggle-switch'],
  ['mcb', 'fuse'], ['fuse', 'fuse'], ['earthing', 'lightning-bolt-circle'],
  ['cctv', 'cctv'], ['surveillance', 'cctv'],
  ['inverter', 'battery-charging'], ['battery', 'battery-charging'], ['ups', 'battery-charging'],
  ['haircut', 'content-cut'], ['hair cut', 'content-cut'], ['hair style', 'content-cut'], ['barber', 'content-cut'],
  ['hair spa', 'hair-dryer'], ['hair colour', 'hair-dryer'], ['hair color', 'hair-dryer'], ['blow-dry', 'hair-dryer'],
  ['facial', 'face-woman'], ['skincare', 'face-woman'], ['skin care', 'face-woman'], ['clean-up', 'face-woman'],
  ['bridal', 'palette'], ['makeup', 'palette'], ['bride', 'palette'],
  ['nail', 'hand-clap'], ['manicure', 'hand-clap'], ['pedicure', 'hand-clap'],
  ['wax', 'content-cut'], ['threading', 'content-cut'],
  ['spa', 'hand-heart'], ['massage', 'hand-heart'],
  ['interior paint', 'format-paint'], ['wall paint', 'format-paint'], ['room paint', 'format-paint'],
  ['exterior paint', 'format-paint'], ['facade', 'format-paint'],
  ['texture', 'brush-variant'], ['design paint', 'brush-variant'], ['wall art', 'brush-variant'],
  ['putty', 'format-paint'], ['primer', 'format-paint'],
  ['wood polish', 'brush'], ['varnish', 'brush'], ['lacquer', 'brush'], ['polish', 'brush'],
  ['waterproof', 'water'], ['damp', 'water'], ['seepage', 'water'],
  ['paint', 'format-paint'],
  ['ac service', 'air-conditioner'], ['ac clean', 'air-conditioner'], ['ac maintenance', 'air-conditioner'],
  ['ac gas', 'air-conditioner'], ['ac install', 'air-conditioner'], ['ac repair', 'wrench'],
  ['ac', 'air-conditioner'],
  ['refrigerator', 'fridge'], ['fridge', 'fridge'], ['freezer', 'fridge'],
  ['washing machine', 'washing-machine'], ['washer repair', 'washing-machine'],
  ['wash & fold', 'washing-machine'], ['wash and fold', 'washing-machine'],
  ['dry clean', 'tshirt-crew'], ['dryclean', 'tshirt-crew'],
  ['iron', 'iron'], ['ironing', 'iron'], ['press cloth', 'iron'], ['pressing', 'iron'],
  ['stain', 'water-alert'], ['spot clean', 'water-alert'],
  ['office', 'office-building'], ['deep clean', 'spray-bottle'],
  ['vehicle', 'car-wash'], ['car wash', 'car-wash'],
  ['pest', 'bug'], ['garden', 'flower'], ['furniture', 'table-furniture'],
  ['utensil', 'silverware-clean'], ['light', 'lightbulb-on'],
];
function getSubcatIcon(name: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const lower = name.toLowerCase();
  for (const [key, icon] of SUBCAT_ICONS) { if (lower.includes(key)) return icon; }
  return 'tag-outline';
}

const ACCENTS = ['#5B3EF5','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316','#06B6D4'];
const hasRealImage = (url?: string | null) => !!url && !url.includes('placeholder');
const ALL_ID = '__all__';

// ── Service card ─────────────────────────────────────────────
interface ServiceCardProps {
  service: Service;
  cartQty: number;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
  loading: boolean;
  colors: ReturnType<typeof useColors>;
  requiresAuth: boolean;
}
function ServiceCard({ service, cartQty, onAdd, onIncrease, onDecrease, loading, colors, requiresAuth }: ServiceCardProps) {
  const img = service.images?.[0];
  const mins = service.duration;
  const hrs = mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins}m`;

  return (
    <View style={[svcStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Image */}
      {img ? (
        <Image source={{ uri: img }} style={svcStyles.image} resizeMode="cover" />
      ) : (
        <View style={[svcStyles.imagePlaceholder, { backgroundColor: colors.muted }]}>
          <MaterialCommunityIcons name="wrench-outline" size={32} color={colors.mutedForeground} />
        </View>
      )}

      {/* Badge */}
      {service.badge ? (
        <View style={[svcStyles.badge, { backgroundColor: '#5B3EF5' }]}>
          <Text style={svcStyles.badgeText}>{service.badge}</Text>
        </View>
      ) : null}

      {/* Body */}
      <View style={svcStyles.body}>
        <Text style={[svcStyles.name, { color: colors.foreground }]} numberOfLines={2}>{service.name}</Text>
        {service.description ? (
          <Text style={[svcStyles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>{service.description}</Text>
        ) : null}

        <View style={svcStyles.meta}>
          <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
          <Text style={[svcStyles.metaText, { color: colors.mutedForeground }]}>{hrs}</Text>
        </View>

        {/* Price + Cart control */}
        <View style={svcStyles.footer}>
          <View>
            <Text style={[svcStyles.price, { color: colors.foreground }]}>
              ₹{service.customerPrice.toLocaleString('en-IN')}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ width: 90 }} />
          ) : cartQty === 0 ? (
            <TouchableOpacity
              style={[svcStyles.addBtn, { backgroundColor: colors.primary }]}
              onPress={requiresAuth ? () => router.push('/auth') : onAdd}
              activeOpacity={0.8}
            >
              <Text style={svcStyles.addBtnText}>Add</Text>
            </TouchableOpacity>
          ) : (
            <View style={[svcStyles.qtyRow, { borderColor: colors.primary }]}>
              <TouchableOpacity onPress={onDecrease} style={svcStyles.qtyBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="remove" size={16} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[svcStyles.qtyNum, { color: colors.primary }]}>{cartQty}</Text>
              <TouchableOpacity onPress={onIncrease} style={svcStyles.qtyBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="add" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────
export default function SubcategoriesScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { categoryId, categoryName } = useLocalSearchParams<{ categoryId: string; categoryName?: string }>();

  const [selectedSubCat, setSelectedSubCat] = useState<string>(ALL_ID);
  const [search, setSearch] = useState('');
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  // ── Sub-categories ───────────────────────────────────────
  const { data: subcategories, isLoading: subcatsLoading } = useQuery({
    queryKey: ['/api/categories', categoryId, 'subcategories'],
    queryFn: () => subcategoriesApi.listByCategory(categoryId),
    enabled: !!categoryId,
    staleTime: 30_000,
  });

  // ── Services ─────────────────────────────────────────────
  const { data: servicesData, isLoading: svcLoading } = useQuery({
    queryKey: ['/api/services', categoryId, selectedSubCat, search],
    queryFn: () => servicesApi.list({
      categoryId,
      ...(selectedSubCat !== ALL_ID ? { subCategoryId: selectedSubCat } : {}),
      ...(search.trim() ? { q: search.trim() } : {}),
    }),
    enabled: !!categoryId,
    staleTime: 15_000,
  });
  const services = servicesData?.services ?? [];

  // ── Cart ─────────────────────────────────────────────────
  const { data: cart } = useQuery({
    queryKey: ['/api/cart', accessToken],
    queryFn: () => cartApi.get(accessToken!),
    enabled: !!accessToken,
    staleTime: 10_000,
  });

  const cartQtyMap = useMemo(() => {
    const map = new Map<string, { itemId: string; qty: number }>();
    (cart?.items ?? []).forEach(item => map.set(item.serviceId, { itemId: item.id, qty: item.quantity }));
    return map;
  }, [cart]);

  const invalidateCart = () => queryClient.invalidateQueries({ queryKey: ['/api/cart'] });

  const addMutation = useMutation({
    mutationFn: (serviceId: string) => cartApi.add(serviceId, 1, accessToken!),
    onMutate: (id) => { setPendingIds(s => new Set(s).add(id)); },
    onSettled: (_, __, id) => { setPendingIds(s => { const n = new Set(s); n.delete(id); return n; }); invalidateCart(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, qty }: { itemId: string; qty: number; serviceId: string }) =>
      qty <= 0 ? cartApi.remove(itemId, accessToken!) : cartApi.update(itemId, qty, accessToken!),
    onMutate: ({ serviceId }) => { setPendingIds(s => new Set(s).add(serviceId)); },
    onSettled: (_, __, { serviceId }) => { setPendingIds(s => { const n = new Set(s); n.delete(serviceId); return n; }); invalidateCart(); },
  });

  // ── Tile list ────────────────────────────────────────────
  const paletteColor = subcategories?.[0]?.color || '#5B3EF5';
  const tiles = useMemo(() => {
    const all = [{ id: ALL_ID, name: 'All', color: paletteColor, iconColor: '#fff' }];
    if (!subcategories) return all;
    return [...all, ...subcategories];
  }, [subcategories, paletteColor]);

  const selectedLabel = selectedSubCat === ALL_ID
    ? 'All Services'
    : (subcategories?.find(s => s.id === selectedSubCat)?.name ?? '') + ' Services';

  // ── Tiles-only header (static — does NOT contain the dynamic section label) ──
  // The section label lives in the data array instead so FlatList always re-renders it.
  const TilesHeader = (
    <View>
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
                    : getSubcatIcon(item.name));
              const iconColor = isAll ? '#fff' : ((item as any).iconColor || '#fff');
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.tileWrap}
                  activeOpacity={0.75}
                  onPress={() => { Haptics.selectionAsync(); setSelectedSubCat(item.id); }}
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
                    style={[styles.tileLabel, { color: isSelected ? accent : colors.foreground }, isSelected && { fontWeight: '700' }]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
      </View>
    </View>
  );

  // ── Typed list data: section-header row first, then service rows ─────────────
  // Putting the label in the data array guarantees FlatList re-renders it when
  // extraData (selectedSubCat) changes — ListHeaderComponent does not reliably
  // re-render on state changes in React Native.
  type ListRow =
    | { type: 'section-header'; label: string; count: number; loading: boolean }
    | { type: 'service' } & Service;

  const listData: ListRow[] = useMemo(() => {
    const header: ListRow = { type: 'section-header', label: selectedLabel, count: services.length, loading: svcLoading };
    if (svcLoading) return [header];
    return [header, ...services.map(s => ({ type: 'service' as const, ...s }))];
  }, [selectedLabel, services, svcLoading]);

  const cartItemCount = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
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
            placeholder="Search services..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} onPress={() => setSearch('')} />
          )}
        </View>
      </View>

      {/* Service list — tiles in header, section label + service rows in data */}
      <FlatList<ListRow>
        data={listData}
        keyExtractor={(row) => row.type === 'section-header' ? '__section_header__' : row.id}
        contentContainerStyle={{ padding: 16, paddingBottom: cartItemCount > 0 ? 100 : 40 }}
        showsVerticalScrollIndicator={false}
        extraData={[selectedSubCat, selectedLabel, cartQtyMap, pendingIds]}
        ListHeaderComponent={TilesHeader}
        renderItem={({ item: row }) => {
          // ── Section-label row (always re-renders because it's in the data array) ──
          if (row.type === 'section-header') {
            if (row.loading) {
              return (
                <View style={{ gap: 12 }}>
                  {[0,1,2,3].map(i => (
                    <View key={i} style={[svcStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={[svcStyles.image, { backgroundColor: colors.border }]} />
                      <View style={svcStyles.body}>
                        <View style={{ height: 14, width: '70%', backgroundColor: colors.border, borderRadius: 6, marginBottom: 8 }} />
                        <View style={{ height: 11, width: '90%', backgroundColor: colors.border, borderRadius: 4, marginBottom: 4 }} />
                        <View style={{ height: 11, width: '60%', backgroundColor: colors.border, borderRadius: 4 }} />
                      </View>
                    </View>
                  ))}
                </View>
              );
            }
            return (
              <View style={[styles.svcHeader, { borderTopColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.foreground, marginBottom: 0 }]}>
                  {row.label}
                </Text>
                <Text style={[styles.svcCount, { color: colors.mutedForeground }]}>
                  {row.count} found
                </Text>
              </View>
            );
          }

          // ── Service card row ──
          const entry = cartQtyMap.get(row.id);
          const qty = entry?.qty ?? 0;
          const loading = pendingIds.has(row.id);
          return (
            <ServiceCard
              service={row}
              cartQty={qty}
              loading={loading}
              colors={colors}
              requiresAuth={!accessToken}
              onAdd={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); addMutation.mutate(row.id); }}
              onIncrease={() => {
                if (!entry) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateMutation.mutate({ itemId: entry.itemId, qty: qty + 1, serviceId: row.id });
              }}
              onDecrease={() => {
                if (!entry) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateMutation.mutate({ itemId: entry.itemId, qty: qty - 1, serviceId: row.id });
              }}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="toolbox-outline" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No services found</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search.trim() ? 'Try a different search term' : 'No services available in this category yet'}
            </Text>
          </View>
        }
      />

      {/* Floating cart bar */}
      {cartItemCount > 0 && <CartAccess />}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  header:       { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 10 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:      { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  title:        { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  searchBar:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, gap: 8 },
  searchInput:  { flex: 1, fontSize: 13, padding: 0 },
  sectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  tileGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tileWrap:     { width: '22%', alignItems: 'center', gap: 6, paddingVertical: 4 },
  tileIcon:     { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tileImage:    { width: 56, height: 56, borderRadius: 16 },
  tileIconSelected: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4, transform: [{ scale: 1.06 }] },
  tileLabel:    { fontSize: 11, fontWeight: '500', textAlign: 'center', lineHeight: 15 },
  tileLabelPh:  { width: '80%', height: 10, borderRadius: 4 },
  svcHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 16, marginBottom: 12 },
  svcCount:     { fontSize: 12 },
  empty:        { alignItems: 'center', paddingTop: 32, gap: 8 },
  emptyTitle:   { fontSize: 16, fontWeight: '700' },
  emptyText:    { fontSize: 13, textAlign: 'center', maxWidth: 240, lineHeight: 18 },
});

const svcStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  image: {
    width: 100,
    height: 110,
  },
  imagePlaceholder: {
    width: 100,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  body: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 3,
  },
  desc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
  },
  addBtn: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  qtyNum: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
});
