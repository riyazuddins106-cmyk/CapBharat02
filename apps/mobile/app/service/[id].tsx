import React, { useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { servicesApi, cartApi } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

// Renders a section only when content exists
function Section({ title, icon, content, colors }: {
  title: string; icon: keyof typeof Ionicons.glyphMap; content: string | null | undefined; colors: any;
}) {
  if (!content?.trim()) return null;
  const lines = content.trim().split('\n').filter(l => l.trim());
  return (
    <View style={[styles.section, { borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconBox, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name={icon} size={16} color={colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      {lines.map((line, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
          <Text style={[styles.bulletText, { color: colors.mutedForeground }]}>{line.replace(/^[•\-\d+\.]\s*/, '')}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [addedFeedback, setAddedFeedback] = useState(false);

  const { data: service, isLoading, isError } = useQuery({
    queryKey: ['/api/services', id],
    queryFn: () => servicesApi.getById(id!),
    enabled: !!id,
  });

  const { data: cart } = useQuery({
    queryKey: ['/api/cart', accessToken],
    queryFn: () => cartApi.get(accessToken!),
    enabled: !!accessToken,
  });

  const cartMutation = useMutation({
    mutationFn: (serviceId: string) => cartApi.add(serviceId, 1, accessToken!),
    onSuccess: (next) => {
      queryClient.setQueryData(['/api/cart', accessToken], next);
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 2000);
    },
  });

  const cartCount = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (isError || !service) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>Service not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Fixed header ───────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.foreground }]}>{service.name}</Text>
        <TouchableOpacity
          onPress={() => accessToken ? router.push('/checkout') : router.push('/auth')}
          style={[styles.cartBtn, { backgroundColor: colors.muted }]}
        >
          <Ionicons name="cart-outline" size={20} color={colors.foreground} />
          {cartCount > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ── Hero image ───────────────────────────────────────────────────── */}
        <View style={styles.heroWrapper}>
          {service.images?.[0] ? (
            <Image source={{ uri: service.images[0] }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="sparkles" size={48} color="#C4B5FD" />
            </View>
          )}
          {service.badge && (
            <View style={[styles.heroBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.heroBadgeText}>{service.badge}</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {/* ── Service name + category ───────────────────────────────────── */}
          <Text style={[styles.name, { color: colors.foreground }]}>{service.name}</Text>
          {(service.categoryName || service.subCategoryName) && (
            <View style={styles.tagRow}>
              {service.categoryName && (
                <View style={[styles.tag, { backgroundColor: colors.primary + '18' }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{service.categoryName}</Text>
                </View>
              )}
              {service.subCategoryName && (
                <View style={[styles.tag, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{service.subCategoryName}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Price + duration chips ────────────────────────────────────── */}
          <View style={[styles.metaRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>₹{service.customerPrice.toLocaleString('en-IN')}</Text>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Price</Text>
            </View>
            <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
            <View style={styles.metaItem}>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>{service.duration} min</Text>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Duration</Text>
            </View>
            {service.requiredSkill && (
              <>
                <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                <View style={styles.metaItem}>
                  <Text numberOfLines={1} style={[styles.metaValue, { color: colors.foreground, fontSize: 13 }]}>{service.requiredSkill}</Text>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Skill</Text>
                </View>
              </>
            )}
          </View>

          {/* ── Short description ─────────────────────────────────────────── */}
          {service.description?.trim() ? (
            <Text style={[styles.description, { color: colors.mutedForeground }]}>{service.description}</Text>
          ) : null}

          {/* ── Detail sections ───────────────────────────────────────────── */}
          <Section title="What's Included"     icon="checkmark-circle-outline" content={service.whatIncluded}       colors={colors} />
          <Section title="What's Not Included" icon="close-circle-outline"     content={service.whatNotIncluded}    colors={colors} />
          <Section title="Service Process"     icon="list-outline"             content={service.serviceProcess}     colors={colors} />
          <Section title="Requirements"        icon="alert-circle-outline"     content={service.requirements}       colors={colors} />
          <Section title="Important Notes"     icon="information-circle-outline" content={service.importantNotes}  colors={colors} />
          <Section title="Cancellation Policy" icon="shield-checkmark-outline" content={service.cancellationPolicy} colors={colors} />

          {/* Fallback when no detail fields are filled yet */}
          {!service.whatIncluded && !service.whatNotIncluded && !service.serviceProcess &&
           !service.requirements && !service.importantNotes && !service.cancellationPolicy && (
            <View style={[styles.section, { borderColor: colors.border, alignItems: 'center', paddingVertical: 24 }]}>
              <Ionicons name="information-circle-outline" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyNote, { color: colors.mutedForeground }]}>
                Detailed information for this service will be available soon.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Sticky bottom bar ──────────────────────────────────────────────── */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bottomPriceCol}>
          <Text style={[styles.bottomPrice, { color: colors.foreground }]}>₹{service.customerPrice.toLocaleString('en-IN')}</Text>
          <Text style={[styles.bottomDuration, { color: colors.mutedForeground }]}>{service.duration} min</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={cartMutation.isPending}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (!accessToken) { router.push('/auth'); return; }
            cartMutation.mutate(service.id);
          }}
          style={[styles.addBtn, { backgroundColor: addedFeedback ? '#22c55e' : colors.primary, opacity: cartMutation.isPending ? 0.7 : 1 }]}
        >
          <Ionicons name={addedFeedback ? 'checkmark' : 'cart-outline'} size={18} color="#fff" />
          <Text style={styles.addBtnText}>
            {addedFeedback ? 'Added to Cart!' : accessToken ? 'Add to Cart' : 'Sign in to Book'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText:        { fontSize: 16, fontWeight: '600' },
  backBtn:          { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backIcon:         { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:      { flex: 1, fontSize: 16, fontWeight: '700' },
  cartBtn:          { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cartBadge:        { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText:    { color: '#fff', fontSize: 9, fontWeight: '800' },
  heroWrapper:      { position: 'relative' },
  heroImage:        { width: '100%', height: 240 },
  heroPlaceholder:  { alignItems: 'center', justifyContent: 'center' },
  heroBadge:        { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  heroBadgeText:    { color: '#fff', fontSize: 11, fontWeight: '800' },
  body:             { padding: 20, gap: 16 },
  name:             { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  tagRow:           { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag:              { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText:          { fontSize: 12, fontWeight: '600' },
  metaRow:          { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  metaItem:         { flex: 1, alignItems: 'center', paddingVertical: 14 },
  metaValue:        { fontSize: 16, fontWeight: '800' },
  metaLabel:        { fontSize: 11, marginTop: 2 },
  metaDivider:      { width: 1 },
  description:      { fontSize: 14, lineHeight: 22 },
  section:          { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIconBox:   { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle:     { fontSize: 15, fontWeight: '700' },
  bulletRow:        { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bulletDot:        { fontSize: 14, lineHeight: 22, fontWeight: '700' },
  bulletText:       { flex: 1, fontSize: 13, lineHeight: 22 },
  emptyNote:        { fontSize: 13, textAlign: 'center', marginTop: 8 },
  bottomBar:        { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1 },
  bottomPriceCol:   { flex: 1 },
  bottomPrice:      { fontSize: 20, fontWeight: '800' },
  bottomDuration:   { fontSize: 12, marginTop: 2 },
  addBtn:           { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  addBtnText:       { color: '#fff', fontSize: 15, fontWeight: '700' },
});
