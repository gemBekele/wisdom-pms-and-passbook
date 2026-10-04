import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { radii, spacing } from '@/theme';
import { ThemedText } from './ThemedText';

type Tone = 'neutral' | 'success' | 'danger' | 'warning' | 'primary' | 'accent';

interface BadgeProps {
  label: string;
  tone?: Tone;
}

const tones: Record<Tone, { bg: keyof typeof import('@/theme/colors').lightColors | string; fg: string }> = {
  neutral: { bg: 'surfaceAlt', fg: 'textSecondary' },
  success: { bg: 'successSoft', fg: 'success' },
  danger: { bg: 'dangerSoft', fg: 'danger' },
  warning: { bg: 'warningSoft', fg: 'warning' },
  primary: { bg: 'primarySoft', fg: 'primary' },
  accent: { bg: 'accentSoft', fg: 'accent' },
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const { colors } = useTheme();
  const { fonts } = useLanguage();
  const t = tones[tone];
  const bg = typeof t.bg === 'string' && t.bg in colors ? (colors as any)[t.bg] : colors.surfaceAlt;
  const fg = typeof t.fg === 'string' && t.fg in colors ? (colors as any)[t.fg] : colors.textSecondary;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <ThemedText variant="tiny" color={fg} style={{ fontFamily: fonts.semibold }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
});