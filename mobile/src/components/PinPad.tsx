import { useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemedText } from './ThemedText';

interface PinPadProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onFilled?: (value: string) => void;
  onBiometrics?: () => void;
  showBiometrics?: boolean;
  error?: boolean;
  disabled?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

export function PinPad({
  length = 4,
  value,
  onChange,
  onFilled,
  onBiometrics,
  showBiometrics = false,
  error = false,
  disabled = false,
}: PinPadProps) {
  const { colors } = useTheme();
  const { fonts } = useLanguage();

  const dots = Array.from({ length }).map((_, i) => value[i] ?? '');

  const press = useCallback(
    (key: string) => {
      if (disabled) return;
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // haptics unavailable
      }
      if (key === 'back') {
        onChange(value.slice(0, -1));
      } else if (value.length < length) {
        const next = value + key;
        onChange(next);
        // Fire once when the pad is filled; avoids the effect-based double fire
        // when a parent re-renders while the value is still at max length.
        if (next.length === length) onFilled?.(next);
      }
    },
    [disabled, onChange, onFilled, value, length],
  );

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {dots.map((char, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: error ? colors.danger : char ? colors.primary : colors.surfaceAlt,
                borderColor: char ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.keys}>
        {KEYS.map((key, i) => {
          if (key === '') {
            return (
              <View key={`empty-${i}`} style={styles.key}>
                {showBiometrics && i === 9 ? (
                  <Pressable
                    onPress={onBiometrics}
                    accessibilityRole="button"
                    accessibilityLabel="Use biometrics"
                    style={({ pressed }) => [
                      styles.keyCircle,
                      { backgroundColor: colors.primarySoft, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Ionicons name="finger-print" size={26} color={colors.primary} />
                  </Pressable>
                ) : null}
              </View>
            );
          }
          if (key === 'back') {
            return (
              <Pressable
                key={key}
                onPress={() => press('back')}
                accessibilityRole="button"
                accessibilityLabel="Delete"
                style={({ pressed }) => [
                  styles.key,
                  { opacity: disabled || value.length === 0 ? 0.3 : pressed ? 0.5 : 1 },
                ]}
              >
                <Ionicons name="backspace-outline" size={26} color={colors.textSecondary} />
              </Pressable>
            );
          }
          return (
            <Pressable
              key={key}
              onPress={() => press(key)}
              accessibilityRole="button"
              accessibilityLabel={`Digit ${key}`}
              style={({ pressed }) => [
                styles.key,
                { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
              ]}
            >
              <View
                style={[
                  styles.keyCircle,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <ThemedText weight="semibold" color={colors.primary} style={[styles.keyText, { fontFamily: fonts.semibold }]}>
                  {key}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginHorizontal: 10,
    borderWidth: 1.5,
  },
  keys: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 3 * 84,
    justifyContent: 'center',
  },
  key: {
    width: 84,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  keyText: {
    fontSize: 26,
  },
});