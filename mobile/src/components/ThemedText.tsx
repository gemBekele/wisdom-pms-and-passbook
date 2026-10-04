import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { fontSizes } from '@/theme';

type Variant = 'display' | 'title' | 'subtitle' | 'body' | 'label' | 'caption' | 'tiny';

const variantStyles: Record<Variant, { size: number; weight: keyof ReturnType<typeof useLanguage>['fonts'] }> = {
  display: { size: fontSizes.display, weight: 'extrabold' },
  title: { size: fontSizes.xl, weight: 'bold' },
  subtitle: { size: fontSizes.lg, weight: 'semibold' },
  body: { size: fontSizes.base, weight: 'regular' },
  label: { size: fontSizes.md, weight: 'semibold' },
  caption: { size: fontSizes.sm, weight: 'regular' },
  tiny: { size: fontSizes.xs, weight: 'medium' },
};

interface ThemedTextProps extends TextProps {
  variant?: Variant;
  weight?: keyof ReturnType<typeof useLanguage>['fonts'];
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function ThemedText({
  variant = 'body',
  weight,
  color,
  style,
  children,
  ...rest
}: ThemedTextProps) {
  const { fonts } = useLanguage();
  const { colors } = useTheme();
  const v = variantStyles[variant];
  const fontFamily = weight ? fonts[weight] : fonts[v.weight];

  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily,
          fontSize: v.size,
          color: color ?? colors.text,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}