import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi, profileApi, setRefreshHandler, type User } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { getExpoPushToken } from '@/lib/pushNotifications';

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

  // Persist tokens — wrapped in try/catch because SecureStore can throw on
  // Android when the Keystore is invalidated (e.g. after biometric change).
  const persistTokens = async (access: string, refresh: string) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, access);
      await SecureStore.setItemAsync(REFRESH_KEY, refresh);
    } catch {
      // Non-fatal: user will be prompted to log in again on next launch
    }
  };
  const clearTokens = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    } catch {
      // Ignore — keys may not exist
    }
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
            registerPushTokenRef.current(storedAccess);
          } catch {
            // Try refreshing
            if (storedRefresh) {
              try {
                const tokens = await authApi.refresh(storedRefresh);
                await persistTokens(tokens.accessToken, tokens.refreshToken);
                const me = await profileApi.me(tokens.accessToken);
                setUser(me);
                setAccessToken(tokens.accessToken);
                registerPushTokenRef.current(tokens.accessToken);
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

  // Register a refresh handler so the API client can silently refresh expired
  // access tokens (15 min TTL) without the user seeing a 401 error.
  const setupRefreshHandler = useCallback((initialRefreshToken: string) => {
    // Keep a mutable ref so the closure always uses the latest refresh token
    let latestRefreshToken = initialRefreshToken;
    setRefreshHandler(async () => {
      try {
        const tokens = await authApi.refresh(latestRefreshToken);
        latestRefreshToken = tokens.refreshToken;
        await persistTokens(tokens.accessToken, tokens.refreshToken);
        setAccessToken(tokens.accessToken);
        return tokens.accessToken;
      } catch {
        return null;
      }
    });
  }, []);

  const registerPushToken = useCallback((token: string) => {
    getExpoPushToken()
      .then((pushToken) => {
        if (pushToken) profileApi.registerPushToken(pushToken, token).catch(() => {});
      })
      .catch(() => {});
  }, []);

  const registerPushTokenRef = useRef(registerPushToken);
  registerPushTokenRef.current = registerPushToken;

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    await persistTokens(data.accessToken, data.refreshToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setupRefreshHandler(data.refreshToken);
    queryClient.clear();
    registerPushToken(data.accessToken);
  }, [registerPushToken, setupRefreshHandler]);

  const register = useCallback(async (payload: { fullName: string; email: string; password: string; phone?: string }) => {
    return authApi.register(payload);
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string, purpose: string) => {
    const data = await authApi.verifyOtp({ email, code, purpose });
    await persistTokens(data.accessToken, data.refreshToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
    queryClient.clear();
    registerPushToken(data.accessToken);
  }, [registerPushToken]);

  const logout = useCallback(async () => {
    try {
      const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
      if (refresh && accessToken) {
        await authApi.logout(refresh, accessToken).catch(() => {});
      }
    } catch {
      // Keystore unavailable — proceed to clear local state anyway
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
