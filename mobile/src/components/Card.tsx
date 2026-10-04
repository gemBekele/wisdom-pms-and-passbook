import { Platform, View, StyleSheet, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { radii } from '@/theme';

interface CardProps extends ViewProps {
  padded?: boolean;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ padded = true, elevated = false, style, children, ...rest }: CardProps) {
  const { colors } = useTheme();
  // RN Web 0.21 deprecates shadow* props; use boxShadow there, native props elsewhere.
  const shadowStyle = Platform.OS === 'web'
    ? { boxShadow: elevated ? `0 10px 28px ${colors.shadow}` : 'none' }
    : { shadowColor: elevated ? colors.shadow : 'transparent' };

  return (
    <View
      {...rest}
      style={[
        styles.base,
        {
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          borderColor: colors.border,
          padding: padded ? 18 : 0,
          ...shadowStyle,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      default: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 1,
        shadowRadius: 24,
        elevation: 4,
      },
    }),
  },
});