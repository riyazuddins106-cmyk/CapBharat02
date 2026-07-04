import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi, profileApi, type User } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

const TOKEN_KEY = 'sn_access_token';
const REFRESH_KEY = 'sn_refresh_token';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { fullName: string; email: string; password: string; phone?: string }) => Promise<{ userId: string }>;
  verifyOtp: (email: string, code: string, purpose: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  resendOtp: (email: string, purpose: string) => Promise<void>;
}

const AuthContext = createContext<AuthState & AuthActions>({
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => ({ userId: '' }),
  verifyOtp: async () => {},
  logout: async () => {},
  forgotPassword: async () => {},
  resetPassword: async () => {},
  resendOtp: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Persist tokens
  const persistTokens = async (access: string, refresh: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  };
  const clearTokens = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  };

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const storedAccess = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedRefresh = await SecureStore.getItemAsync(REFRESH_KEY);
        if (storedAccess) {
          try {
            const me = await profileApi.me(storedAccess);
            setUser(me);
            setAccessToken(storedAccess);
          } catch {
            // Try refreshing
            if (storedRefresh) {
              try {
                const tokens = await authApi.refresh(storedRefresh);
                await persistTokens(tokens.accessToken, tokens.refreshToken);
                const me = await profileApi.me(tokens.accessToken);
                setUser(me);
                setAccessToken(tokens.accessToken);
              } catch {
                await clearTokens();
              }
            } else {
              await clearTokens();
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    await persistTokens(data.accessToken, data.refreshToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
    queryClient.clear();
  }, []);

  const register = useCallback(async (payload: { fullName: string; email: string; password: string; phone?: string }) => {
    return authApi.register(payload);
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string, purpose: string) => {
    const data = await authApi.verifyOtp({ email, code, purpose });
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
      isAuthenticated: !!user,
      login, register, verifyOtp, logout, forgotPassword, resetPassword, resendOtp,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
