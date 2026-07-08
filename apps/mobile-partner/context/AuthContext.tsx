import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authApi, setRefreshHandler, type User } from '@/lib/api';
import { storage } from '@/lib/storage';
import { queryClient } from '@/lib/queryClient';
import { getExpoPushToken } from '@/lib/pushNotifications';

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

// Wrapped in try/catch: SecureStore can throw on Android when the Keystore
// is invalidated (e.g. after biometric/PIN changes on the device).
async function persistTokens(access: string, refresh: string) {
  try {
    await storage.setItem(ACCESS_KEY, access);
    await storage.setItem(REFRESH_KEY, refresh);
  } catch {
    // Non-fatal: user will be prompted to log in again on next launch
  }
}

async function clearTokens() {
  try {
    await storage.deleteItem(ACCESS_KEY);
    await storage.deleteItem(REFRESH_KEY);
  } catch {
    // Ignore — keys may not exist
  }
}

function isPartnerRole(role: string) {
  return role === 'partner' || role === 'admin';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount — re-validate role after token refresh
  useEffect(() => {
    (async () => {
      try {
        const refresh = await storage.getItem(REFRESH_KEY);
        if (!refresh) return;

        const tokens = await authApi.refresh(refresh);
        await persistTokens(tokens.accessToken, tokens.refreshToken);

        // Fetch user profile to confirm role
        const profile = await authApi.getMe(tokens.accessToken);
        if (!isPartnerRole(profile.role)) {
          // Stored session belongs to a customer account — clear it
          await clearTokens();
          return;
        }

        setAccessToken(tokens.accessToken);
        setUser(profile);
        setupRefreshHandler(tokens.refreshToken);
        registerPushTokenRef.current(tokens.accessToken);
      } catch {
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Register a refresh handler so the API client can silently refresh expired
  // access tokens (15 min TTL) without the user seeing a 401 error.
  const setupRefreshHandler = useCallback((initialRefreshToken: string) => {
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
        if (pushToken) authApi.registerPushToken(pushToken, token).catch(() => {});
      })
      .catch(() => {});
  }, []);

  const registerPushTokenRef = useRef(registerPushToken);
  registerPushTokenRef.current = registerPushToken;

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    if (!isPartnerRole(data.user.role)) {
      throw new Error('This account is not registered as a partner. Please use the ServeNow customer app.');
    }
    await persistTokens(data.accessToken, data.refreshToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setupRefreshHandler(data.refreshToken);
    queryClient.clear();
    registerPushToken(data.accessToken);
  }, [registerPushToken, setupRefreshHandler]);

  const logout = useCallback(async () => {
    try {
      const refresh = await storage.getItem(REFRESH_KEY);
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
