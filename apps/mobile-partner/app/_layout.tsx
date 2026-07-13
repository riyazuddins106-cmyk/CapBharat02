import React, { useEffect, Component, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { useRouter, useSegments } from 'expo-router';

SplashScreen.preventAutoHideAsync();

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
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#f0faf9' }]}>
      {children}
    </View>
  );
}

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === 'auth';
    if (!isAuthenticated && !inAuth) {
      router.replace('/auth');
    } else if (isAuthenticated && inAuth) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <WebPhoneFrame>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AuthGate />
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false }} />
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
      </WebPhoneFrame>
    </ErrorBoundary>
  );
}
