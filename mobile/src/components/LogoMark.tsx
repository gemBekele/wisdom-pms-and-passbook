import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from './ThemedText';

export function LogoMark({ size = 48 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: size / 3,
          backgroundColor: colors.primary,
        },
      ]}
    >
      <ThemedText
        variant="subtitle"
        weight="extrabold"
        color={colors.onPrimary}
        style={[styles.letter, { fontSize: size * 0.44 }]}
      >
        G
      </ThemedText>
      <View
        style={[
          styles.dot,
          {
            width: size * 0.26,
            height: size * 0.26,
            borderRadius: size * 0.13,
            backgroundColor: colors.accent,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    lineHeight: undefined,
  },
  dot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
  },
});
