import { useRef, useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { radii } from '@/theme';
import { ThemedText } from './ThemedText';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onFilled?: (value: string) => void;
  error?: boolean;
}

export function OTPInput({ length = 6, value, onChange, onFilled, error }: OTPInputProps) {
  const { colors } = useTheme();
  const { fonts } = useLanguage();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const chars = Array.from({ length }).map((_, i) => value[i] ?? '');

  const handleChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onFilled?.(clean);
  };

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.wrap}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={length}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hiddenInput}
        accessibilityLabel="One time code"
      />
      {chars.map((char, i) => {
        const isActive = focused && i === value.length;
        return (
          <View
            key={i}
            style={[
              styles.box,
              {
                backgroundColor: colors.surface,
                borderColor: error
                  ? colors.danger
                  : isActive
                    ? colors.accent
                    : colors.border,
              },
            ]}
          >
            {char !== '' ? (
              <ThemedText weight="bold" color={colors.primary} style={{ fontSize: 24, fontFamily: fonts.bold }}>
                {char}
              </ThemedText>
            ) : isActive ? (
              <View style={[styles.caret, { backgroundColor: colors.accent }]} />
            ) : null}
          </View>
        );
      })}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  box: {
    width: 46,
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caret: {
    width: 2,
    height: 26,
    borderRadius: 1,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    zIndex: -1,
  },
});