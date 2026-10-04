import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { radii, spacing } from '@/theme';
import { ThemedText } from './ThemedText';

type Variant = 'primary' | 'accent' | 'dark' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  size = 'lg',
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const { fonts } = useLanguage();

  const background: Record<Variant, string> = {
    primary: colors.primary,
    accent: colors.accent,
    dark: colors.navSurface,
    secondary: colors.surfaceAlt,
    ghost: 'transparent',
    danger: colors.danger,
  };

  const textColor: Record<Variant, string> = {
    primary: colors.onPrimary,
    accent: colors.onAccent,
    dark: '#ffffff',
    secondary: colors.text,
    ghost: colors.primary,
    danger: colors.onPrimary,
  };

  const isPressedDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isPressedDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background[variant],
          opacity: isPressedDisabled ? 0.5 : pressed ? 0.85 : 1,
          height: size === 'lg' ? 56 : 48,
          borderRadius: radii.pill,
          alignSelf: fullWidth ? 'stretch' : 'auto',
          paddingHorizontal: fullWidth ? spacing.lg : spacing.xl,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} />
      ) : (
        <ThemedText
          weight="semibold"
          variant={size === 'lg' ? 'label' : 'body'}
          color={textColor[variant]}
          style={{ fontFamily: fonts.semibold }}
        >
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});
