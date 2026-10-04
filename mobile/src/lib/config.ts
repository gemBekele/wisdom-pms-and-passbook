import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  useMock?: boolean;
};

const envUrl = process.env.EXPO_PUBLIC_API_URL;
const envMock = process.env.EXPO_PUBLIC_USE_MOCK;

const API_PORT = 5000;

/**
 * The backend runs on the same machine as the Expo dev server. Derive the host
 * from the dev server so the Android emulator and physical devices on the same
 * network can reach it (`localhost` does not work from Android).
 * Set EXPO_PUBLIC_API_URL to override (e.g. a remote backend).
 */
function resolveApiHost(): string {
  const anyConstants = Constants as unknown as {
    expoGoConfig?: { debuggerHost?: string };
  };
  const hostUri = Constants.expoConfig?.hostUri ?? anyConstants.expoGoConfig?.debuggerHost;
  const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : undefined;

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${API_PORT}`;
  }
  return Platform.OS === 'android'
    ? `http://10.0.2.2:${API_PORT}`
    : `http://localhost:${API_PORT}`;
}

export const config = {
  apiUrl: envUrl || `${resolveApiHost()}/api/v1/mobile`,
  useMock: envMock ? envMock === 'true' : Boolean(extra.useMock),
};
