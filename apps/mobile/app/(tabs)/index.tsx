import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList,
  RefreshControl, Platform, Modal, ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { categoriesApi, professionalsApi, offersApi, addressesApi, notificationsApi, type Offer } from '@/lib/api';
import { ProCard } from '@/components/ProCard';
import { ProCardShimmer } from '@/components/Shimmer';
import { storage } from '@/lib/storage';

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

const LOCATION_KEY = 'sn_selected_location';
const { width: SCREEN_W } = Dimensions.get('window');
const BANNER_W = SCREEN_W - 32;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Offer banner card ──────────────────────────────────────
function OfferBanner({ offer, colors }: { offer: Offer; colors: any }) {
  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: offer.bgColor, width: BANNER_W, borderRadius: colors.radius }]}
      activeOpacity={0.92}
      onPress={() => { Haptics.selectionAsync(); router.push('/(tabs)/services'); }}
    >
      <View style={styles.bannerContent}>
        {offer.tag ? <Text style={styles.bannerTag}>{offer.tag}</Text> : null}
        <Text style={styles.bannerTitle}>{offer.title}</Text>
        {offer.subtitle ? <Text style={styles.bannerSubtitle}>{offer.subtitle}</Text> : null}
        <TouchableOpacity
          style={styles.bannerBtn}
          activeOpacity={0.85}
          onPress={() => { Haptics.selectionAsync(); router.push('/(tabs)/services'); }}
        >
          <Text style={[styles.bannerBtnText, { color: offer.bgColor }]}>{offer.ctaText}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bannerDecor}>
        {offer.discountText ? (
          <Text style={styles.bannerDiscount}>{offer.discountText}</Text>
        ) : (
          <MaterialCommunityIcons name="home-search" size={72} color="rgba(255,255,255,0.15)" />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Dot indicator ──────────────────────────────────────────
function DotsIndicator({ count, active, colors }: { count: number; active: number; colors: any }) {
  if (count <= 1) return null;
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i === active ? colors.primary : colors.border, width: i === active ? 18 : 6 }]} />
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, accessToken } = useAuth();

  const { data: unreadData } = useQuery({
    queryKey: ['/api/notifications/unread-count', accessToken],
    queryFn: () => notificationsApi.unreadCount(accessToken!),
    enabled: !!accessToken,
    refetchInterval: 30000,
  });
  const unreadNotifCount = unreadData?.count ?? 0;

  // ── Location state ─────────────────────────────────────
  const [locationLabel, setLocationLabel] = useState('Detecting…');
  const [locationModal, setLocationModal] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  // Load persisted location on mount
  useEffect(() => {
    storage.getItem(LOCATION_KEY).then((saved) => {
      if (saved) setLocationLabel(saved);
      else detectLocation(false);
    });
  }, []);

  async function detectLocation(showSpinner = true) {
    if (showSpinner) setDetectingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationLabel('Select location');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync(pos.coords);
      if (geo) {
        const label = [geo.name || geo.street, geo.city || geo.district, geo.region]
          .filter(Boolean).slice(0, 2).join(', ');
        setLocationLabel(label || 'Current Location');
        await storage.setItem(LOCATION_KEY, label || 'Current Location');
      } else {
        setLocationLabel('Current Location');
      }
    } catch {
      setLocationLabel('Select location');
    } finally {
      setDetectingGps(false);
    }
  }

  async function pickAddress(label: string, line1: string, city: string) {
    const loc = `${line1}, ${city}`;
    setLocationLabel(loc);
    await storage.setItem(LOCATION_KEY, loc);
    setLocationModal(false);
  }

  // ── Queries ────────────────────────────────────────────
  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: categoriesApi.list,
  });

  const { data: professionals, isLoading: prosLoading, refetch } = useQuery({
    queryKey: ['/api/professionals'],
    queryFn: () => professionalsApi.list(),
  });

  const { data: offers = [] } = useQuery({
    queryKey: ['/api/offers'],
    queryFn: offersApi.listActive,
    staleTime: 5 * 60 * 1000,
  });

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['/api/addresses', accessToken],
    queryFn: () => addressesApi.list(accessToken!),
    enabled: !!accessToken,
  });

  // ── Offers carousel ────────────────────────────────────
  const [activeOffer, setActiveOffer] = useState(0);
  const offersRef = useRef<FlatList<Offer>>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (offers.length <= 1) return;
    autoScrollRef.current = setInterval(() => {
      setActiveOffer((prev) => {
        const next = (prev + 1) % offers.length;
        offersRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
  }, [offers.length]);

  // ── Pull to refresh ────────────────────────────────────
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
            {user ? (user.fullName?.split(' ')?.[0] ?? 'User') : 'Guest'} 👋
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.muted }]}
            onPress={() => { Haptics.selectionAsync(); router.push('/notifications'); }}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
            {unreadNotifCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: colors.primary, borderColor: colors.card }]}>
                <Text style={styles.notifBadgeText}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Location bar — tappable */}
      <TouchableOpacity
        style={[styles.locationBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        onPress={() => setLocationModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="location" size={14} color={colors.primary} />
        <Text style={[styles.locationText, { color: colors.foreground }]} numberOfLines={1}>
          {detectingGps ? 'Detecting…' : locationLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
      </TouchableOpacity>

      {/* Offers carousel */}
      {offers.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          <FlatList
            ref={offersRef}
            data={offers}
            keyExtractor={(o) => o.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={BANNER_W + 12}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            renderItem={({ item }) => <OfferBanner offer={item} colors={colors} />}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_W + 12));
              setActiveOffer(Math.max(0, Math.min(idx, offers.length - 1)));
            }}
            getItemLayout={(_, index) => ({ length: BANNER_W + 12, offset: (BANNER_W + 12) * index, index })}
          />
          <DotsIndicator count={offers.length} active={activeOffer} colors={colors} />
        </View>
      ) : (
        /* Fallback static banner while loading */
        <View style={[styles.banner, { backgroundColor: colors.primary, marginHorizontal: 16, marginTop: 16, borderRadius: colors.radius, width: undefined }]}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTag}>LIMITED OFFER</Text>
            <Text style={styles.bannerTitle}>40% off{'\n'}your first booking</Text>
            <TouchableOpacity style={styles.bannerBtn} activeOpacity={0.85}
              onPress={() => { Haptics.selectionAsync(); router.push('/(tabs)/services'); }}>
              <Text style={[styles.bannerBtnText, { color: colors.primary }]}>Book Now</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bannerDecor}>
            <MaterialCommunityIcons name="home-search" size={80} color="rgba(255,255,255,0.15)" />
          </View>
        </View>
      )}

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

      {/* Location picker modal */}
      <Modal visible={locationModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalBackdrop}>
          <View style={[styles.locationSheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Select Location</Text>

            {/* Detect GPS */}
            <TouchableOpacity
              style={[styles.gpsRow, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}
              onPress={async () => { setLocationModal(false); await detectLocation(true); }}
              activeOpacity={0.8}
            >
              {detectingGps
                ? <ActivityIndicator size={18} color={colors.primary} />
                : <Ionicons name="navigate" size={18} color={colors.primary} />}
              <View style={{ flex: 1 }}>
                <Text style={[styles.gpsTitle, { color: colors.foreground }]}>Use current location</Text>
                <Text style={[styles.gpsSub, { color: colors.mutedForeground }]}>Detect via GPS</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Saved addresses */}
            {savedAddresses.length > 0 && (
              <>
                <Text style={[styles.savedLabel, { color: colors.mutedForeground }]}>SAVED ADDRESSES</Text>
                {savedAddresses.map((addr) => (
                  <TouchableOpacity
                    key={addr.id}
                    style={[styles.addrRow, { borderColor: colors.border }]}
                    onPress={() => pickAddress(addr.label, addr.line1, addr.city)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.addrIcon, { backgroundColor: colors.secondary }]}>
                      <Ionicons
                        name={addr.label === 'Home' ? 'home' : addr.label === 'Work' ? 'briefcase' : addr.label === 'Hotel' ? 'bed' : 'location'}
                        size={16}
                        color={colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.addrLabel, { color: colors.foreground }]}>{addr.label}</Text>
                      <Text style={[styles.addrLine, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {addr.line1}, {addr.city}
                      </Text>
                    </View>
                    {addr.isDefault && (
                      <View style={[styles.defaultDot, { backgroundColor: colors.primary }]} />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            <TouchableOpacity
              style={[styles.addAddrBtn, { borderColor: colors.primary, borderRadius: colors.radius }]}
              onPress={() => { setLocationModal(false); router.push('/addresses'); }}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.addAddrText, { color: colors.primary }]}>Manage saved addresses</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setLocationModal(false)} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  greeting:       { fontSize: 13 },
  name:           { fontSize: 22, fontWeight: '700', marginTop: 1 },
  headerRight:    { flexDirection: 'row', gap: 8 },
  headerBtn:      { width: 38, height: 38, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  notifBadge:     { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  locationBar:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  locationText:   { flex: 1, fontSize: 13, fontWeight: '600' },
  // Banners
  banner:         { padding: 20, overflow: 'hidden', flexDirection: 'row', minHeight: 128 },
  bannerContent:  { flex: 1, gap: 6 },
  bannerTag:      { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  bannerTitle:    { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 26 },
  bannerSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  bannerBtn:      { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, alignSelf: 'flex-start', marginTop: 6 },
  bannerBtnText:  { fontSize: 13, fontWeight: '700' },
  bannerDecor:    { alignItems: 'center', justifyContent: 'center', paddingLeft: 10 },
  bannerDiscount: { color: 'rgba(255,255,255,0.25)', fontSize: 40, fontWeight: '900' },
  dots:           { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 10 },
  dot:            { height: 6, borderRadius: 3 },
  // Categories
  section:              { paddingHorizontal: 16, marginTop: 24 },
  sectionHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:         { fontSize: 18, fontWeight: '700' },
  seeAll:               { fontSize: 13, fontWeight: '600' },
  catGrid:              { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catItem:              { width: '22%', aspectRatio: 0.9, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  catIcon:              { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catLabel:             { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  catLabelPlaceholder:  { width: '70%', height: 10, borderRadius: 4 },
  // Trust
  trust:      { flexDirection: 'row', justifyContent: 'space-around', padding: 16, marginTop: 24, borderWidth: 1 },
  trustItem:  { alignItems: 'center', gap: 6 },
  trustLabel: { fontSize: 12, fontWeight: '600' },
  // Location modal
  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  locationSheet:  { margin: 0, padding: 24, paddingBottom: 40, gap: 12 },
  sheetHandle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center', marginBottom: 4 },
  sheetTitle:     { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  gpsRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  gpsTitle:       { fontSize: 14, fontWeight: '600' },
  gpsSub:         { fontSize: 12, marginTop: 1 },
  savedLabel:     { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  addrRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  addrIcon:       { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addrLabel:      { fontSize: 14, fontWeight: '600' },
  addrLine:       { fontSize: 12, marginTop: 1 },
  defaultDot:     { width: 8, height: 8, borderRadius: 4 },
  addAddrBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, paddingVertical: 11, paddingHorizontal: 16, marginTop: 4 },
  addAddrText:    { fontSize: 14, fontWeight: '600' },
  cancelBtn:      { alignItems: 'center', paddingVertical: 8 },
  cancelText:     { fontSize: 14 },
});
