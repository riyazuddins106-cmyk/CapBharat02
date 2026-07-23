import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { cartApi } from '@/lib/api';

export function CartAccess() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { data: cart } = useQuery({
    queryKey: ['/api/cart', accessToken],
    queryFn: () => cartApi.get(accessToken!),
    enabled: !!accessToken,
  });

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const bottomOffset = Platform.OS === 'ios' ? 92 : Platform.OS === 'web' ? 76 + 34 : 68;

  return (
    <TouchableOpacity
      testID="floating-cart-button"
      onPress={() => router.push(accessToken ? '/checkout' : '/auth')}
      activeOpacity={0.88}
      style={[
        styles.floating,
        {
          bottom: bottomOffset + (Platform.OS === 'web' ? 0 : Math.max(0, insets.bottom - 8)),
          backgroundColor: colors.primary,
          shadowColor: colors.foreground,
        },
      ]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="cart-outline" size={21} color="#fff" />
        <View style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
          <Text style={styles.badgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
        </View>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{itemCount ? `${itemCount} ${itemCount === 1 ? 'Service' : 'Services'}` : 'Cart'}</Text>
        <Text style={styles.subtitle}>{itemCount ? `₹${(cart?.total ?? 0).toLocaleString('en-IN')} · View cart` : 'View cart'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  floating: {
    position: 'absolute',
    right: 16,
    minWidth: 156,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
    zIndex: 20,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  iconWrap: { position: 'relative', marginRight: 9 },
  badge: {
    position: 'absolute',
    top: -7,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800', textAlign: 'center' },
  copy: { flex: 1 },
  title: { color: '#fff', fontSize: 13, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '600', marginTop: 1 },
});