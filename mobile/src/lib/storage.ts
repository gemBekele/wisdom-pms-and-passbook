import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const PREFIX = 'ghion.';

const webStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return globalThis.localStorage?.getItem(PREFIX + key) ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      globalThis.localStorage?.setItem(PREFIX + key, value);
    } catch {
      // ignore quota / privacy errors
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      globalThis.localStorage?.removeItem(PREFIX + key);
    } catch {
      // ignore
    }
  },
};

const nativeStorage = {
  async getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(PREFIX + key);
  },
  async setItem(key: string, value: string): Promise<void> {
    return SecureStore.setItemAsync(PREFIX + key, value);
  },
  async removeItem(key: string): Promise<void> {
    return SecureStore.deleteItemAsync(PREFIX + key);
  },
};

const storage = Platform.OS === 'web' ? webStorage : nativeStorage;

export const STORAGE_KEYS = {
  language: 'language',
  theme: 'theme',
  authSession: 'auth.session',
  authToken: 'auth.token',
  biometricsEnabled: 'auth.biometrics',
  hasPin: 'auth.hasPin',
  phone: 'auth.phone',
} as const;

export const getItem = storage.getItem.bind(storage);
export const setItem = storage.setItem.bind(storage);
export const removeItem = storage.removeItem.bind(storage);