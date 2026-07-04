// Partner app uses a teal/green palette to distinguish from the customer purple app
export const Colors = {
  light: {
    primary: '#0f766e',        // teal-700
    primaryForeground: '#FFFFFF',
    secondary: '#ccfbf1',      // teal-100
    secondaryForeground: '#0f766e',
    accent: '#f59e0b',         // amber-500
    accentForeground: '#FFFFFF',
    background: '#f0fdfa',     // teal-50
    foreground: '#0f1117',
    card: '#FFFFFF',
    cardForeground: '#0f1117',
    muted: '#e6f7f5',
    mutedForeground: '#6B7280',
    border: '#d1fae5',
    destructive: '#D4183D',
    destructiveForeground: '#FFFFFF',
    success: '#16A34A',
    warning: '#D97706',
    radius: 10,
  },
};

export type ColorScheme = typeof Colors.light;
