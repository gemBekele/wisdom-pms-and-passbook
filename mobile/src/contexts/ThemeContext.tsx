import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from '@/theme';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    (async () => {
      const stored = await getItem(STORAGE_KEYS.theme);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
    })();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void setItem(STORAGE_KEYS.theme, next);
  }, []);

  const isDark = mode === 'system' ? scheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const value = useMemo(() => ({ isDark, mode, setMode, colors }), [isDark, mode, setMode, colors]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
