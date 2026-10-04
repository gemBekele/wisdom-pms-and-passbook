import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { spacing } from '@/theme';
import { formatAmount, formatDate, formatMoney } from '@/lib/format';
import type { TransactionEntry } from '@/types';
import { ThemedText } from './ThemedText';

interface TransactionRowProps {
  entry: TransactionEntry;
  onPress?: () => void;
  showBalanceAfter?: boolean;
}

export function TransactionRow({ entry, onPress, showBalanceAfter = true }: TransactionRowProps) {
  const { colors } = useTheme();
  const { fonts, language } = useLanguage();
  const { t } = useTranslation();
  const credit = entry.amount >= 0;

  const meta = showBalanceAfter
    ? `${formatDate(entry.date, language)} · ${t('home.balance')} ${formatMoney(entry.balanceAfter)}`
    : formatDate(entry.date, language);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, { opacity: pressed && onPress ? 0.6 : 1 }]}
    >
      <View style={[styles.icon, { backgroundColor: credit ? colors.successSoft : colors.primarySoft }]}>
        <Ionicons
          name={credit ? 'arrow-down' : 'arrow-up'}
          size={18}
          color={credit ? colors.success : colors.primary}
        />
      </View>
      <View style={styles.descCol}>
        <ThemedText variant="body" weight="semibold" numberOfLines={1} style={{ fontFamily: fonts.semibold }}>
          {entry.description}
        </ThemedText>
        <ThemedText variant="tiny" color={colors.textTertiary} numberOfLines={1} style={{ fontFamily: fonts.medium }}>
          {meta}
        </ThemedText>
      </View>
      <View style={styles.amountCol}>
        <ThemedText
          variant="body"
          weight="semibold"
          color={credit ? colors.success : colors.text}
          style={{ fontFamily: fonts.semibold }}
        >
          {credit ? '+' : '−'}{formatAmount(Math.abs(entry.amount))}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descCol: {
    flex: 1,
    gap: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
});
