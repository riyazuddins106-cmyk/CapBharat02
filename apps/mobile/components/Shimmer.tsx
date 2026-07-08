import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

// Uses opacity animation instead of interpolateColor — fully compatible with
// react-native-reanimated v4 and Expo Go's forced New Architecture.
function ShimmerBox({
  width,
  height,
  borderRadius = 8,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
}) {
  const colors = useColors();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius, backgroundColor: colors.border },
        animStyle,
      ]}
    />
  );
}

export function ProCardShimmer() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <ShimmerBox width={80} height={80} borderRadius={10} />
      <View style={styles.info}>
        <ShimmerBox width="80%" height={14} />
        <ShimmerBox width="55%" height={11} />
        <ShimmerBox width="65%" height={11} />
        <ShimmerBox width="100%" height={32} borderRadius={8} />
      </View>
    </View>
  );
}

export function CategoryShimmer() {
  return (
    <View style={styles.catRow}>
      {[80, 100, 90, 110, 85].map((w, i) => (
        <ShimmerBox key={i} width={w} height={34} borderRadius={100} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 10,
    gap: 12,
  },
  info: { flex: 1, gap: 8 },
  catRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
});
