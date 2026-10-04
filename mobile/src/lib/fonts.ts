import * as Font from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  NotoSansEthiopic_400Regular,
  NotoSansEthiopic_500Medium,
  NotoSansEthiopic_600SemiBold,
  NotoSansEthiopic_700Bold,
  NotoSansEthiopic_800ExtraBold,
} from '@expo-google-fonts/noto-sans-ethiopic';

export const INTER_FONTS = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
};

export const NOTO_FONTS = {
  NotoSansEthiopic_400Regular,
  NotoSansEthiopic_500Medium,
  NotoSansEthiopic_600SemiBold,
  NotoSansEthiopic_700Bold,
  NotoSansEthiopic_800ExtraBold,
};

export const loadFonts = async (includeAmharic: boolean) => {
  await Font.loadAsync(includeAmharic ? { ...INTER_FONTS, ...NOTO_FONTS } : INTER_FONTS);
};