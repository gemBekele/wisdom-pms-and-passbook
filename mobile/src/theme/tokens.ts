import type { Language } from '@/types';

export interface FontSet {
  regular: string;
  medium: string;
  semibold: string;
  bold: string;
  extrabold: string;
}

export const fontsByLanguage: Record<Language, FontSet> = {
  en: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extrabold: 'Inter_800ExtraBold',
  },
  am: {
    regular: 'NotoSansEthiopic_400Regular',
    medium: 'NotoSansEthiopic_500Medium',
    semibold: 'NotoSansEthiopic_600SemiBold',
    bold: 'NotoSansEthiopic_700Bold',
    extrabold: 'NotoSansEthiopic_800ExtraBold',
  },
};

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  display: 36,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
};

export const appBrand = {
  name: 'Ghion SACCOS',
  tagline: 'Your money, your future',
};