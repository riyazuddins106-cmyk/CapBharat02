import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Platform-safe storage:
 *  - Native → expo-secure-store (encrypted keychain / keystore)
 *  - Web    → localStorage (no native keychain available)
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); } catch { /* ignore */ }
      return;
    }
    try { await SecureStore.setItemAsync(key, value); } catch { /* ignore */ }
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
      return;
    }
    try { await SecureStore.deleteItemAsync(key); } catch { /* ignore */ }
  },
};
