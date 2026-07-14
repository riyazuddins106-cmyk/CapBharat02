import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Professional } from '@/lib/api';

interface Props {
  pro: Professional;
  onPress: () => void;
  onBook?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  compact?: boolean;
}

export function ProCard({ pro, onPress, onBook, isFavorite, onToggleFavorite, compact }: Props) {
  const colors = useColors();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      {/* Avatar + badge */}
      <View style={styles.avatarWrap}>
        {pro.avatarUrl ? (
          <Image source={{ uri: pro.avatarUrl }} style={[styles.avatar, { borderRadius: colors.radius }]} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>{pro.name[0]}</Text>
          </View>
        )}
        {pro.badge && (
          <View style={[styles.badge, {
            backgroundColor: pro.badge === 'Top Rated' ? '#5B3EF5' : pro.badge === 'New' ? '#16A34A' : colors.primary,
          }]}>
            <Text style={styles.badgeText}>{pro.badge}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{pro.name}</Text>
          {onToggleFavorite && (
            <TouchableOpacity onPress={onToggleFavorite} hitSlop={8}>
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={18} color={isFavorite ? colors.destructive : colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.title, { color: colors.mutedForeground }]} numberOfLines={1}>{pro.title}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="star" size={12} color="#FBBF24" />
          <Text style={[styles.rating, { color: colors.foreground }]}>{pro.rating}</Text>
          <Text style={[styles.reviews, { color: colors.mutedForeground }]}>({pro.reviewCount})</Text>
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <Text style={[styles.price, { color: colors.primary }]}>₹{pro.basePrice}</Text>
          <Text style={[styles.priceUnit, { color: colors.mutedForeground }]}>{pro.priceUnit}</Text>
        </View>

        {!compact && (pro.tags ?? []).length > 0 && (
          <View style={styles.tags}>
            {(pro.tags ?? []).slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {onBook && (
          <TouchableOpacity
            onPress={onBook}
            activeOpacity={0.85}
            style={[styles.bookBtn, { backgroundColor: colors.primary, borderRadius: colors.radius - 2 }]}
          >
            <Text style={styles.bookBtnText}>Book Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', padding: 14, marginBottom: 12, borderWidth: 1, gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 80, height: 80 },
  avatarPlaceholder: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 28, fontWeight: '700' },
  badge: { position: 'absolute', bottom: 4, left: 0, right: 0, paddingVertical: 2, borderRadius: 4, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', flex: 1 },
  title: { fontSize: 12, marginTop: -2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap' },
  rating: { fontSize: 12, fontWeight: '600' },
  reviews: { fontSize: 11 },
  dot: { width: 3, height: 3, borderRadius: 2, marginHorizontal: 2 },
  price: { fontSize: 14, fontWeight: '700' },
  priceUnit: { fontSize: 11 },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  tagText: { fontSize: 11, fontWeight: '600' },
  bookBtn: { marginTop: 8, paddingVertical: 8, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
