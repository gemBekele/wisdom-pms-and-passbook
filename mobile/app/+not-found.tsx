import { View, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemedText } from '@/components/ThemedText';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const { fonts } = useLanguage();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedText variant="title" weight="bold" style={{ fontFamily: fonts.bold }}>
        Page not found
      </ThemedText>
      <Link href="/">
        <ThemedText variant="body" color={colors.primary}>
          Go home
        </ThemedText>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});