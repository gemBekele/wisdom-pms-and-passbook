import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import type { CustomerProfile } from '@/types';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { getAuthToken, loadAuthToken, setAuthToken, setUnauthorizedHandler } from '@/lib/http';
import { getItem, removeItem, setItem, STORAGE_KEYS } from '@/lib/storage';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  profile: CustomerProfile | null;
  phone: string;
  hasPin: boolean;
  biometricsEnabled: boolean;
  biometricsAvailable: boolean;
  isOnboarding: boolean;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (otp: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  loginWithPin: (pin: string) => Promise<void>;
  loginWithBiometrics: () => Promise<boolean>;
  enableBiometrics: () => Promise<void>;
  disableBiometrics: () => Promise<void>;
  logout: () => Promise<void>;
  forgotPin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [phone, setPhone] = useState('');
  const [hasPin, setHasPin] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    // If any request returns 401, drop the session so the UI returns to sign-in.
    setUnauthorizedHandler(() => {
      setProfile(null);
      setStatus('signedOut');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      const [session, pinFlag, bioFlag, storedPhone] = await Promise.all([
        getItem(STORAGE_KEYS.authSession),
        getItem(STORAGE_KEYS.hasPin),
        getItem(STORAGE_KEYS.biometricsEnabled),
        getItem(STORAGE_KEYS.phone),
      ]);

      let bioAvailable = false;
      try {
        bioAvailable = await LocalAuthentication.hasHardwareAsync();
      } catch {
        // biometrics are unavailable on this platform (e.g. web)
      }
      setBiometricsAvailable(bioAvailable);
      if (bioFlag === '1') setBiometricsEnabled(true);
      if (storedPhone) setPhone(storedPhone);
      if (pinFlag === '1') setHasPin(true);

      if (config.useMock) {
        if (session) {
          setProfile(JSON.parse(session));
          setStatus('signedIn');
        } else {
          setStatus('signedOut');
        }
        return;
      }

      // Real backend: validate the stored token before restoring the session.
      const token = await loadAuthToken();
      if (!token) {
        // Keep hasPin/phone so returning users can sign in with their PIN.
        await removeItem(STORAGE_KEYS.authSession);
        setProfile(null);
        setStatus('signedOut');
        return;
      }
      try {
        const p = await api.getProfile();
        setProfile(p);
        setStatus('signedIn');
      } catch {
        await setAuthToken(null);
        setStatus('signedOut');
      }
    })();
  }, []);

  const requestOtp = useCallback(async (number: string) => {
    await api.requestOtp(number);
    setPhone(number);
    await setItem(STORAGE_KEYS.phone, number);
    setIsOnboarding(true);
  }, []);

  const finishSession = useCallback(async (p: CustomerProfile) => {
    setProfile(p);
    setHasPin(true);
    setStatus('signedIn');
    await Promise.all([
      setItem(STORAGE_KEYS.authSession, JSON.stringify(p)),
      setItem(STORAGE_KEYS.hasPin, '1'),
    ]);
  }, []);

  const verifyOtp = useCallback(async (otp: string) => {
    const result = await api.verifyOtp(phone, otp);
    setIsOnboarding(result.needsPinSetup);
    if (!result.needsPinSetup) {
      const p = await api.getProfile();
      await finishSession(p);
    }
    return result.needsPinSetup;
  }, [phone, finishSession]);

  const setPin = useCallback(async (pin: string) => {
    await api.setPin(pin);
    const p = await api.getProfile();
    await finishSession(p);
  }, [finishSession]);

  const loginWithPin = useCallback(async (pin: string) => {
    await api.login(phone, pin);
    const p = await api.getProfile();
    await finishSession(p);
  }, [finishSession, phone]);

  const loginWithBiometrics = useCallback(async () => {
    if (!biometricsEnabled || !biometricsAvailable) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to Ghion SACCOS',
      cancelLabel: 'Use PIN',
      fallbackLabel: 'Use PIN',
    });
    if (!result.success) return false;

    // The token lives in secure storage; biometrics only gates access to it.
    if (!config.useMock) {
      if (!getAuthToken()) await loadAuthToken();
      if (!getAuthToken()) return false;
    } else {
      await api.login(phone, '');
    }

    const p = await api.getProfile();
    await finishSession(p);
    return true;
  }, [biometricsAvailable, biometricsEnabled, finishSession, phone]);

  const enableBiometrics = useCallback(async () => {
    setBiometricsEnabled(true);
    await setItem(STORAGE_KEYS.biometricsEnabled, '1');
  }, []);

  const disableBiometrics = useCallback(async () => {
    setBiometricsEnabled(false);
    await removeItem(STORAGE_KEYS.biometricsEnabled);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    await Promise.all([removeItem(STORAGE_KEYS.authSession), removeItem(STORAGE_KEYS.biometricsEnabled)]);
    setProfile(null);
    setBiometricsEnabled(false);
    setStatus('signedOut');
  }, []);

  const forgotPin = useCallback(async () => {
    await api.logout();
    await Promise.all([
      removeItem(STORAGE_KEYS.authSession),
      removeItem(STORAGE_KEYS.hasPin),
      removeItem(STORAGE_KEYS.phone),
      removeItem(STORAGE_KEYS.biometricsEnabled),
    ]);
    setProfile(null);
    setHasPin(false);
    setPhone('');
    setBiometricsEnabled(false);
    setStatus('signedOut');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      profile,
      phone,
      hasPin,
      biometricsEnabled,
      biometricsAvailable,
      isOnboarding,
      requestOtp,
      verifyOtp,
      setPin,
      loginWithPin,
      loginWithBiometrics,
      enableBiometrics,
      disableBiometrics,
      logout,
      forgotPin,
    }),
    [status, profile, phone, hasPin, biometricsEnabled, biometricsAvailable, isOnboarding, requestOtp, verifyOtp, setPin, loginWithPin, loginWithBiometrics, enableBiometrics, disableBiometrics, logout, forgotPin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
