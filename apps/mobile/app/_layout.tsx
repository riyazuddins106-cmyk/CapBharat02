import React, { useEffect, Component, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { queryClient } from '@/lib/queryClient';

// SplashScreen is native-only — calling it on web shows a white overlay
// that never gets removed, leaving a permanently blank page.
if (Platform.OS !== 'web') SplashScreen.preventAutoHideAsync();

// ── Error boundary: prevents a single render error from crashing the whole app ──
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.title}>Something went wrong</Text>
          <Text style={ebStyles.message}>
            {(this.state.error as Error | null)?.message ?? 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            style={ebStyles.btn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={ebStyles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#f7f8fa' },
  title: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 8 },
  message: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: '#5B3EF5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// On web: fills the full viewport so the app is scrollable and fits the screen.
// On native: renders children directly with no extra wrapper.
function WebPhoneFrame({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#f7f8fa' }]}>
      {children}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    ...Ionicons.font,
  });

  // Safety net: on some networks/browsers, the useFonts() promise can stall
  // indefinitely without ever resolving or rejecting (observed reliably over
  // the public HTTPS tunnel, even though the same font requests succeed
  // instantly via curl and the same code works fine on localhost) — leaving
  // the app stuck on a blank white screen forever. Force the app to render
  // with fallback fonts after a short timeout rather than hang forever.
  const [fontTimedOut, setFontTimedOut] = React.useState(false);
  useEffect(() => {
    if (fontsLoaded || fontError) return;
    const timer = setTimeout(() => setFontTimedOut(true), 300);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontsLoaded || fontError || fontTimedOut) {
      if (Platform.OS !== 'web') SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, fontTimedOut]);

  if (!fontsLoaded && !fontError && !fontTimedOut) return null;

  return (
    <ErrorBoundary>
      <WebPhoneFrame>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="auth" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                <Stack.Screen name="professional/[id]" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="addresses" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="wishlist" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="points" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="privacy-security" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="help-support" options={{ animation: 'slide_from_right' }} />
              </Stack>
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
      </WebPhoneFrame>
    </ErrorBoundary>
  );
}
