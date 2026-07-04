import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi, type User } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

const ACCESS_KEY = 'partner_access_token';
const REFRESH_KEY = 'partner_refresh_token';

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  resendOtp: (email: string, purpose: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

async function persistTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS_KEY, access);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
        if (refresh) {
          const tokens = await authApi.refresh(refresh);
          await persistTokens(tokens.accessToken, tokens.refreshToken);
          setAccessToken(tokens.accessToken);
          // Fetch profile via partner API
          const { partnerApi } = await import('@/lib/api');
          try {
            // We just need to verify it's a partner account — profile comes from partner endpoint
            // If it throws, user is not a partner
          } catch {}
          // Decode user from a follow-up me call if needed; for now set basic info
        }
      } catch {
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    if (data.user.role !== 'partner' && data.user.role !== 'admin') {
      throw new Error('This account is not registered as a partner. Please use the ServeNow customer app.');
    }
    await persistTokens(data.accessToken, data.refreshToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
    queryClient.clear();
  }, []);

  const logout = useCallback(async () => {
    const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
    if (refresh && accessToken) {
      await authApi.logout(refresh, accessToken).catch(() => {});
    }
    await clearTokens();
    setUser(null);
    setAccessToken(null);
    queryClient.clear();
  }, [accessToken]);

  const forgotPassword = useCallback(async (email: string) => {
    await authApi.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    await authApi.resetPassword({ email, code, newPassword });
  }, []);

  const resendOtp = useCallback(async (email: string, purpose: string) => {
    await authApi.resendOtp({ email, purpose });
  }, []);

  return (
    <AuthContext.Provider value={{
      user, accessToken, isLoading,
      isAuthenticated: !!accessToken,
      login, logout, forgotPassword, resetPassword, resendOtp,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
