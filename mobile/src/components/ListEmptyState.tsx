import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from './ThemedText';

interface ListEmptyStateProps {
  title: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function ListEmptyState({ title, hint, icon = 'receipt-outline' }: ListEmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={28} color={colors.textTertiary} />
      </View>
      <ThemedText variant="label" color={colors.textSecondary} style={styles.title}>
        {title}
      </ThemedText>
      {hint ? (
        <ThemedText variant="caption" color={colors.textTertiary} style={styles.hint}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
    marginTop: 6,
  },
});