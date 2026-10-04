import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './en';
import am from './am';

export const supportedLanguages = ['en', 'am'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export function getDeviceLanguage(): SupportedLanguage {
  const code = getLocales()[0]?.languageCode?.toLowerCase();
  return code === 'am' ? 'am' : 'en';
}

export function isSupportedLanguage(code: string | null | undefined): code is SupportedLanguage {
  return !!code && (supportedLanguages as readonly string[]).includes(code);
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;