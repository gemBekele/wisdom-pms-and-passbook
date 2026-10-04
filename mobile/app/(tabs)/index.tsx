import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { TransactionRow } from '@/components/TransactionRow';
import { AccountCardCarousel } from '@/components/AccountCardCarousel';
import { ListSkeleton } from '@/components/Skeleton';
import { ListEmptyState } from '@/components/ListEmptyState';
import { spacing } from '@/theme';
import type { Account, TransactionEntry } from '@/types';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fonts, language } = useLanguage();
  const auth = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const activeRef = useRef(0);

  const loadTransactions = useCallback(async (accountNumber: string) => {
    setLoadingTx(true);
    const data = await api.getTransactions(accountNumber);
    setTransactions(data);
    setLoadingTx(false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getAccounts();
        setAccounts(data);
        if (data.length > 0) {
          await loadTransactions(data[0].accountNumber);
        }
      } catch {
        // Leave lists empty; pull-to-refresh lets the user retry.
      } finally {
        setLoadingAccounts(false);
      }
    })();
  }, [loadTransactions]);

  const onIndexChange = useCallback(
    async (index: number) => {
      if (index === activeRef.current) return;
      activeRef.current = index;
      setActiveIndex(index);
      const account = accounts[index];
      if (account) await loadTransactions(account.accountNumber);
    },
    [accounts, loadTransactions],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api.getAccounts();
      setAccounts(data);
      const account = data[activeRef.current];
      if (account) await loadTransactions(account.accountNumber);
    } catch {
      // ignore; keep current data
    } finally {
      setRefreshing(false);
    }
  }, [loadTransactions]);

  const activeAccount = accounts[activeIndex];

  return (
    <Screen padded={false}>
      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TransactionRow entry={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
              <View>
                <ThemedText variant="caption" color={colors.textTertiary} style={{ fontFamily: fonts.medium }}>
                  {t('home.greeting')} 👋
                </ThemedText>
                <ThemedText variant="title" weight="bold" style={{ fontFamily: fonts.bold }}>
                  {auth.profile?.fullName?.split(' ')[0]}
                </ThemedText>
              </View>
              <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
                <ThemedText weight="extrabold" color={colors.primary} style={{ fontFamily: fonts.extrabold }}>
                  {auth.profile?.fullName?.[0]}
                </ThemedText>
              </View>
            </View>

            {loadingAccounts ? (
              <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
                <ListSkeleton rows={1} />
              </View>
            ) : (
              <View style={{ marginTop: spacing.md }}>
                <AccountCardCarousel accounts={accounts} activeIndex={activeIndex} onIndexChange={onIndexChange} />
              </View>
            )}

            <View style={[styles.sectionTitle, { paddingHorizontal: spacing.lg }]}>
              <View style={styles.sectionTitleLeft}>
                <View style={[styles.accentBar, { backgroundColor: colors.accent }]} />
                <ThemedText variant="label" style={{ fontFamily: fonts.semibold }}>
                  {t('home.recent')}
                </ThemedText>
              </View>
              {activeAccount ? (
                <ThemedText variant="tiny" color={colors.textTertiary} style={{ fontFamily: fonts.medium }} numberOfLines={1}>
                  {activeAccount.product}
                </ThemedText>
              ) : null}
            </View>

            {loadingTx ? (
              <View style={{ paddingHorizontal: spacing.lg }}>
                <ListSkeleton rows={4} />
              </View>
            ) : transactions.length === 0 ? (
              <Card style={styles.emptyCard}>
                <ListEmptyState title={t('home.noActivity')} hint={t('home.noActivityHint')} />
              </Card>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loadingTx && transactions.length === 0 ? null : undefined
        }
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.lg,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accentBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 56,
  },
  emptyCard: {
    marginHorizontal: spacing.lg,
  },
});