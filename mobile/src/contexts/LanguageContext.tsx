import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import i18n, { getDeviceLanguage, isSupportedLanguage, type SupportedLanguage } from '@/i18n';
import { fontsByLanguage, type FontSet } from '@/theme';
import { loadFonts } from '@/lib/fonts';
import { getItem, removeItem, setItem, STORAGE_KEYS } from '@/lib/storage';

interface LanguageContextValue {
  language: SupportedLanguage;
  fonts: FontSet;
  followDevice: boolean;
  fontsReady: boolean;
  fontVersion: number;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  setFollowDevice: (follow: boolean) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');
  const [followDevice, setFollowDeviceState] = useState(true);
  // fontVersion increments whenever a font load settles, forcing text consumers
  // to re-render so newly loaded font families actually apply.
  const [fontVersion, setFontVersion] = useState(0);
  const loadedInter = useRef(false);
  const loadedNoto = useRef(false);

  // Load Inter up front; fetch the (heavier) Amharic fonts only when needed so
  // the initial bundle/network cost stays low. Failures fall back to system fonts.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (language === 'am') {
          loadedInter.current = true;
          loadedNoto.current = true;
          await loadFonts(true);
        } else if (!loadedInter.current) {
          loadedInter.current = true;
          await loadFonts(false);
        }
      } catch (err) {
        console.warn('Custom fonts failed to load; using system fonts.', (err as Error)?.message || err);
      } finally {
        if (active) setFontVersion(v => v + 1);
      }
    })();
    return () => {
      active = false;
    };
  }, [language]);

  useEffect(() => {
    (async () => {
      const saved = await getItem(STORAGE_KEYS.language);
      if (saved && isSupportedLanguage(saved)) {
        setFollowDeviceState(false);
        setLanguageState(saved);
        i18n.changeLanguage(saved);
      } else {
        const device = getDeviceLanguage();
        setLanguageState(device);
        i18n.changeLanguage(device);
      }
    })();
  }, []);

  const fontsReady = fontVersion > 0;

  const value = useMemo<LanguageContextValue>(() => {
    const setLanguage = async (lang: SupportedLanguage) => {
      setFollowDeviceState(false);
      setLanguageState(lang);
      i18n.changeLanguage(lang);
      await setItem(STORAGE_KEYS.language, lang);
    };
    const setFollowDevice = async (follow: boolean) => {
      setFollowDeviceState(follow);
      if (follow) {
        const device = getDeviceLanguage();
        setLanguageState(device);
        i18n.changeLanguage(device);
        await removeItem(STORAGE_KEYS.language);
      }
    };
    return {
      language,
      fonts: fontsByLanguage[language],
      followDevice,
      fontsReady,
      fontVersion,
      setLanguage,
      setFollowDevice,
    };
  }, [language, followDevice, fontsReady, fontVersion]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}