// Design tokens synced from apps/customer-web/src/styles/theme.css
export const Colors = {
  light: {
    primary: '#5B3EF5',
    primaryForeground: '#FFFFFF',
    secondary: '#EDE9FD',
    secondaryForeground: '#3B27A1',
    accent: '#FF6B35',
    accentForeground: '#FFFFFF',
    background: '#F7F8FA',
    foreground: '#0F1117',
    card: '#FFFFFF',
    cardForeground: '#0F1117',
    muted: '#EEF0F5',
    mutedForeground: '#6B7280',
    border: '#E5E7EB',
    destructive: '#D4183D',
    destructiveForeground: '#FFFFFF',
    success: '#16A34A',
    warning: '#D97706',
    radius: 10,
    // Category colors
    cat: {
      cleaning: { bg: '#EDE9FD', icon: '#5B3EF5' },
      plumbing:  { bg: '#FEF3C7', icon: '#D97706' },
      electrical:{ bg: '#DCFCE7', icon: '#16A34A' },
      salon:     { bg: '#FCE7F3', icon: '#DB2777' },
      painting:  { bg: '#DBEAFE', icon: '#2563EB' },
      acRepair:  { bg: '#FFF7ED', icon: '#EA580C' },
      laundry:   { bg: '#F0FDF4', icon: '#15803D' },
      more:      { bg: '#F3F4F6', icon: '#6B7280' },
    },
  },
};

export type ColorScheme = typeof Colors.light;
