import React, { useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { cartApi } from '@/lib/api';

const EDGE_MARGIN = 16;
const CART_H     = 52;
const SPRING     = { useNativeDriver: false, tension: 120, friction: 14 } as const;

export function CartAccess() {
  const colors          = useColors();
  const insets          = useSafeAreaInsets();
  const { accessToken } = useAuth();

  const { data: cart } = useQuery({
    queryKey: ['/api/cart', accessToken],
    queryFn:  () => cartApi.get(accessToken!),
    enabled:  !!accessToken,
  });

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  // ── original bottom offset (unchanged from working version) ───────────────
  const bottomOffset = Platform.OS === 'ios' ? 92 : Platform.OS === 'web' ? 76 + 34 : 68;
  const bottomTotal  = bottomOffset + (Platform.OS === 'web' ? 0 : Math.max(0, insets.bottom - 8));

  const { width: SW, height: SH } = Dimensions.get('window');

  // Mutable refs — never cause worklet warnings
  const cartWidthRef  = useRef(156);
  const snappedRight  = useRef(true);
  const pan           = useRef(new Animated.ValueXY()).current;

  // ── snap to nearest edge after drag ───────────────────────────────────────
  const snapToEdge = (dx: number, dy: number) => {
    const w = cartWidthRef.current;

    // Current absolute left edge of the cart
    const absLeft = (snappedRight.current ? SW - w - EDGE_MARGIN : EDGE_MARGIN) + dx;
    const goRight = absLeft + w / 2 > SW / 2;
    snappedRight.current = goRight;

    // translateX to reach the target side from home (right-anchored)
    const homeLeft  = SW - w - EDGE_MARGIN;
    const targetX   = goRight ? 0 : -(homeLeft - EDGE_MARGIN);

    // Clamp Y so cart stays on screen
    const homeTop   = SH - bottomTotal - CART_H;
    const absTop    = homeTop + dy;
    const minTop    = (insets.top ?? 0) + 56;
    const maxTop    = SH - bottomTotal - CART_H;
    const targetY   = Math.max(minTop - homeTop, Math.min(absTop - homeTop, maxTop - homeTop));

    Animated.parallel([
      Animated.spring(pan.x, { toValue: targetX, ...SPRING }),
      Animated.spring(pan.y, { toValue: targetY, ...SPRING }),
    ]).start();
  };

  // ── PanResponder ───────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      // Don't steal touch on start — let TouchableOpacity handle taps
      onStartShouldSetPanResponder: () => false,
      // Only take over once the user actually moves (drag intent)
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 6 || Math.abs(gs.dy) > 6,

      onPanResponderGrant: () => {
        // Capture current offset so drag starts from current position
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: (_, gs) => {
        pan.flattenOffset();
        snapToEdge(gs.moveX ? (pan.x as any)._value : gs.dx,
                   gs.moveY ? (pan.y as any)._value : gs.dy);
      },
      onPanResponderTerminate: (_, gs) => {
        pan.flattenOffset();
        snapToEdge((pan.x as any)._value, (pan.y as any)._value);
      },
    }),
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      onLayout={(e) => { cartWidthRef.current = e.nativeEvent.layout.width; }}
      style={[
        styles.floating,
        {
          bottom:          bottomTotal,
          backgroundColor: colors.primary,
          shadowColor:     colors.foreground,
          transform:       [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
    >
      <TouchableOpacity
        testID="floating-cart-button"
        onPress={() => router.push(accessToken ? '/checkout' : '/auth')}
        activeOpacity={0.88}
        style={styles.inner}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="cart-outline" size={21} color="#fff" />
          <View style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
            <Text style={styles.badgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
          </View>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>
            {itemCount ? `${itemCount} ${itemCount === 1 ? 'Service' : 'Services'}` : 'Cart'}
          </Text>
          <Text style={styles.subtitle}>
            {itemCount ? `₹${(cart?.total ?? 0).toLocaleString('en-IN')} · View cart` : 'View cart'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floating: {
    position:          'absolute',
    right:             EDGE_MARGIN,
    minWidth:          156,
    borderRadius:      16,
    zIndex:            20,
    elevation:         8,
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.2,
    shadowRadius:      8,
  },
  inner: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 13,
    paddingVertical:   10,
  },
  iconWrap: { position: 'relative', marginRight: 9 },
  badge: {
    position:          'absolute',
    top:               -7,
    right:             -8,
    minWidth:          16,
    height:            16,
    borderRadius:      8,
    paddingHorizontal: 3,
    alignItems:        'center',
    justifyContent:    'center',
    borderWidth:       1.5,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800', textAlign: 'center' },
  copy:      { flex: 1 },
  title:     { color: '#fff', fontSize: 13, fontWeight: '800' },
  subtitle:  { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '600', marginTop: 1 },
});
