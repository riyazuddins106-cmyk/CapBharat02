import React from 'react';
import { Text, View } from 'react-native';

type NativeIconProps = {
  name: string;
  size?: number;
  color?: string;
};

const SERVICE_EMOJI: Record<string, string> = {
  broom: '🧹',
  'pipe-wrench': '🔧',
  'water-pump': '🚰',
  pipe: '🪠',
  toilet: '🚽',
  thermometer: '🌡️',
  'lightning-bolt': '⚡',
  'content-cut': '✂️',
  'format-paint': '🖌️',
  'air-conditioner': '❄️',
  'washing-machine': '🧺',
  'home-heart': '🏠',
  'shower-head': '🚿',
  'silverware-fork-knife': '🍴',
  stove: '🍳',
  sofa: '🛋️',
  rug: '🧶',
  'truck-delivery': '🚚',
  'office-building': '🏢',
  'tag-outline': '🏷️',
  'dots-grid': '⋯',
  grid: '▦',
  'grid-outline': '▦',
  'sparkles-outline': '✦',
  'water-outline': '💧',
  'flash-outline': '⚡',
  'cut-outline': '✂️',
  'color-palette-outline': '🎨',
  'snow-outline': '❄️',
  'shirt-outline': '👕',
  'home-outline': '⌂',
  'today-outline': '📅',
  'calendar-outline': '📅',
  'wallet-outline': '₹',
  'cash-outline': '₹',
  'notifications-outline': '🔔',
  'layers-outline': '▱',
  'time-outline': '◷',
};

const SERVICE_TYPE_ICON_RULES: Array<[string[], string]> = [
  [['deep home', 'home clean', 'full home'], 'home-heart'],
  [['bathroom', 'toilet'], 'shower-head'],
  [['kitchen', 'chimney', 'stove'], 'silverware-fork-knife'],
  [['sofa', 'upholstery'], 'sofa'],
  [['carpet'], 'rug'],
  [['move-in', 'move-out', 'move in', 'move out', 'handover'], 'truck-delivery'],
  [['office', 'commercial'], 'office-building'],
  [['pipe', 'leak', 'burst'], 'pipe-wrench'],
  [['tap', 'faucet', 'mixer'], 'water-pump'],
  [['geyser', 'water heater', 'boiler'], 'thermometer'],
  [['drain', 'blockage', 'clog', 'sewer'], 'pipe'],
  [['wiring', 'rewiring', 'short circuit'], 'lightning-bolt'],
  [['fan', 'light', 'led', 'chandelier'], 'lightning-bolt'],
  [['haircut', 'hair cut', 'barber'], 'content-cut'],
  [['facial', 'skincare', 'clean-up'], 'sparkles-outline'],
  [['nail', 'manicure', 'pedicure'], 'content-cut'],
  [['paint', 'putty', 'primer', 'polish'], 'format-paint'],
  [['ac', 'refrigerator', 'fridge'], 'air-conditioner'],
  [['washing machine', 'washer', 'laundry'], 'washing-machine'],
];

export function getNativeServiceTypeIcon(name: string): string {
  const normalized = name.trim().toLowerCase();
  for (const [keywords, icon] of SERVICE_TYPE_ICON_RULES) {
    if (keywords.some((keyword) => normalized.includes(keyword))) return icon;
  }
  return 'tag-outline';
}

/**
 * Small font-independent icon set for the primary navigation and category
 * surfaces. Expo Go can report an icon font as loaded while rendering blank
 * glyphs on some Android tunnel sessions, so these shapes do not depend on a
 * font file.
 */
export function NativeIcon({ name, size = 22, color = '#111827' }: NativeIconProps) {
  const s = Math.max(14, size);
  const stroke = Math.max(1.5, s * 0.085);
  const common = { position: 'absolute' as const, backgroundColor: color };

  if (SERVICE_EMOJI[name]) {
    return (
      <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: s * 0.78, lineHeight: s }}>{SERVICE_EMOJI[name]}</Text>
      </View>
    );
  }

  if (name === 'home') {
    return (
      <View style={{ width: s, height: s }}>
        <View style={{ position: 'absolute', left: s * .2, top: s * .35, width: s * .6, height: s * .5, borderWidth: stroke, borderColor: color, borderRadius: s * .08 }} />
        <View style={{ position: 'absolute', left: s * .27, top: s * .15, width: s * .46, height: s * .46, borderLeftWidth: stroke, borderTopWidth: stroke, borderColor: color, transform: [{ rotate: '45deg' }] }} />
        <View style={{ position: 'absolute', left: s * .45, top: s * .59, width: s * .12, height: s * .26, borderRadius: s * .02, backgroundColor: color }} />
      </View>
    );
  }

  if (name === 'search') {
    return (
      <View style={{ width: s, height: s }}>
        <View style={{ position: 'absolute', left: s * .12, top: s * .1, width: s * .55, height: s * .55, borderWidth: stroke, borderColor: color, borderRadius: s }} />
        <View style={{ position: 'absolute', left: s * .62, top: s * .62, width: s * .32, height: stroke, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
      </View>
    );
  }

  if (name === 'calendar') {
    return (
      <View style={{ width: s, height: s }}>
        <View style={{ position: 'absolute', left: s * .1, top: s * .2, width: s * .8, height: s * .68, borderWidth: stroke, borderColor: color, borderRadius: s * .1 }} />
        <View style={{ position: 'absolute', left: s * .1, top: s * .38, width: s * .8, height: stroke, backgroundColor: color }} />
        <View style={{ position: 'absolute', left: s * .28, top: s * .08, width: stroke, height: s * .24, backgroundColor: color }} />
        <View style={{ position: 'absolute', left: s * .65, top: s * .08, width: stroke, height: s * .24, backgroundColor: color }} />
        <View style={[common, { left: s * .29, top: s * .52, width: s * .08, height: s * .08, borderRadius: s, }]} />
        <View style={[common, { left: s * .58, top: s * .52, width: s * .08, height: s * .08, borderRadius: s, }]} />
      </View>
    );
  }

  if (name === 'person') {
    return (
      <View style={{ width: s, height: s }}>
        <View style={{ position: 'absolute', left: s * .35, top: s * .1, width: s * .3, height: s * .3, borderWidth: stroke, borderColor: color, borderRadius: s }} />
        <View style={{ position: 'absolute', left: s * .18, top: s * .55, width: s * .64, height: s * .3, borderWidth: stroke, borderColor: color, borderRadius: s * .32, borderBottomColor: 'transparent' }} />
      </View>
    );
  }

  if (name === 'bell') {
    return (
      <View style={{ width: s, height: s }}>
        <View style={{ position: 'absolute', left: s * .2, top: s * .2, width: s * .6, height: s * .55, borderWidth: stroke, borderColor: color, borderRadius: s * .28, borderBottomLeftRadius: s * .12, borderBottomRightRadius: s * .12 }} />
        <View style={{ position: 'absolute', left: s * .12, top: s * .72, width: s * .76, height: stroke, backgroundColor: color, borderRadius: s }} />
        <View style={{ position: 'absolute', left: s * .43, top: s * .8, width: s * .14, height: s * .1, borderRadius: s, backgroundColor: color }} />
      </View>
    );
  }

  if (name === 'wallet') {
    return (
      <View style={{ width: s, height: s }}>
        <View style={{ position: 'absolute', left: s * .1, top: s * .25, width: s * .8, height: s * .55, borderWidth: stroke, borderColor: color, borderRadius: s * .1 }} />
        <View style={{ position: 'absolute', left: s * .55, top: s * .43, width: s * .36, height: s * .22, borderWidth: stroke, borderColor: color, borderRadius: s * .06, backgroundColor: 'transparent' }} />
        <View style={{ position: 'absolute', left: s * .68, top: s * .52, width: s * .07, height: s * .07, borderRadius: s, backgroundColor: color }} />
      </View>
    );
  }

  if (name === 'list') {
    return (
      <View style={{ width: s, height: s, justifyContent: 'space-evenly', paddingVertical: s * .17 }}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: s * .1, height: s * .1, borderRadius: s, backgroundColor: color }} />
            <View style={{ width: s * .6, height: stroke, marginLeft: s * .12, borderRadius: s, backgroundColor: color }} />
          </View>
        ))}
      </View>
    );
  }

  if (name === 'chevron-forward') {
    return <View style={{ width: s * .45, height: s * .45, borderTopWidth: stroke, borderRightWidth: stroke, borderColor: color, transform: [{ rotate: '45deg' }] }} />;
  }

  if (name === 'chevron-down') {
    return <View style={{ width: s * .4, height: s * .4, borderRightWidth: stroke, borderBottomWidth: stroke, borderColor: color, transform: [{ rotate: '45deg' }, { translateY: -s * .1 }] }} />;
  }

  if (name === 'location') {
    return (
      <View style={{ width: s, height: s }}>
        <View style={{ position: 'absolute', left: s * .22, top: s * .08, width: s * .56, height: s * .56, borderWidth: stroke, borderColor: color, borderRadius: s, transform: [{ rotate: '45deg' }] }} />
        <View style={{ position: 'absolute', left: s * .43, top: s * .28, width: s * .14, height: s * .14, borderRadius: s, backgroundColor: color }} />
      </View>
    );
  }

  return <View style={{ width: s * .5, height: s * .5, borderRadius: s, backgroundColor: color }} />;
}
