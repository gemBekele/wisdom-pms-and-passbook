import { useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { radii, spacing } from '@/theme';
import { formatDate, formatMoney, maskAccount } from '@/lib/format';
import type { Account } from '@/types';
import { ThemedText } from './ThemedText';

interface AccountCardCarouselProps {
  accounts: Account[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

export function AccountCardCarousel({ accounts, activeIndex, onIndexChange }: AccountCardCarouselProps) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { fonts, language } = useLanguage();
  const { t } = useTranslation();
  const [localIndex, setLocalIndex] = useState(0);

  const CARD_WIDTH = Math.min(width - spacing.lg * 2, 420);
  const snapInterval = CARD_WIDTH + spacing.lg;

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / snapInterval);
    setLocalIndex(index);
    onIndexChange(index);
  };

  return (
    <View>
      <FlatList
        data={accounts}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}
        onMomentumScrollEnd={onMomentumEnd}
        initialScrollIndex={activeIndex}
        getItemLayout={(_, index) => ({ length: snapInterval, offset: snapInterval * index, index })}
        renderItem={({ item }) => {
          const isLoan = item.accountType === 'Loan';
          const amount = isLoan && item.loan ? item.loan.outstanding : item.balance;
          return (
            <View style={[styles.card, { width: CARD_WIDTH, backgroundColor: colors.primary }]}>
              <View style={[styles.decor, { backgroundColor: colors.accent }]} />
              <View style={styles.cardTop}>
                <ThemedText variant="caption" color={colors.onPrimary} style={[styles.dim, { fontFamily: fonts.semibold }]}>
                  {item.product}
                </ThemedText>
                <View style={[styles.chip, { backgroundColor: colors.accent }]}>
                  <ThemedText variant="tiny" color={colors.onAccent} style={{ fontFamily: fonts.semibold }}>
                    {maskAccount(item.accountNumber)}
                  </ThemedText>
                </View>
              </View>

              <ThemedText variant="tiny" color={colors.onPrimary} style={[styles.dim, { fontFamily: fonts.medium }]}>
                {isLoan ? t('home.loanOutstanding') : t('home.available')}
              </ThemedText>
              <ThemedText variant="display" weight="extrabold" color={colors.onPrimary} style={[styles.balance, { fontFamily: fonts.extrabold }]}>
                {formatMoney(amount)}
              </ThemedText>

              <View style={styles.cardBottom}>
                <ThemedText variant="caption" color={colors.onPrimary} style={[styles.dim, { fontFamily: fonts.medium }]}>
                  {t('home.lastActivity')} {formatDate(item.lastActivity, language)}
                </ThemedText>
              </View>
            </View>
          );
        }}
      />
      {accounts.length > 1 ? (
        <View style={styles.dots}>
          {accounts.map((account, i) => (
            <View
              key={account.id}
              style={[
                styles.dot,
                {
                  backgroundColor: i === localIndex ? colors.accent : colors.disabled,
                  width: i === localIndex ? 22 : 6,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    minHeight: 178,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  decor: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -70,
    bottom: -80,
    opacity: 0.18,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  balance: {
    marginTop: 2,
  },
  cardBottom: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dim: {
    opacity: 0.78,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
