import { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { ThemedText } from '@/components/ThemedText';
import { ListEmptyState } from '@/components/ListEmptyState';
import { ListSkeleton } from '@/components/Skeleton';
import { formatAmount, formatMoney } from '@/lib/format';
import { showAlert } from '@/lib/alert';
import { radii, spacing } from '@/theme';
import type { LoanEligibility, LoanProduct, LoanRequest } from '@/types';

const TERMS = [6, 12, 18, 24];

export default function LoanScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fonts } = useLanguage();

  const [eligibility, setEligibility] = useState<LoanEligibility | null>(null);
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [elig, reqs, prods] = await Promise.all([
          api.getLoanEligibility(),
          api.getLoanRequests(),
          api.getLoanProducts(),
        ]);
        setEligibility(elig);
        setRequests(reqs);
        setProducts(prods);
      } catch {
        // Show defaults; the card explains eligibility is unavailable.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusTone = (status: LoanRequest['status']) =>
    status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning';
  const statusLabel = (status: LoanRequest['status']) =>
    status === 'approved' ? t('loan.statusApproved') : status === 'rejected' ? t('loan.statusRejected') : t('loan.statusPending');

  return (
    <Screen scroll contentContainerStyle={{ paddingBottom: 120 }}>
      <ThemedText variant="title" weight="bold" style={[styles.pageTitle, { fontFamily: fonts.bold }]}>
        {t('loan.title')}
      </ThemedText>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : (
        <>
          <Card style={[styles.eligCard, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            <View style={[styles.heroDecor, { backgroundColor: colors.accent }]} />
            <View style={styles.eligHeader}>
              <ThemedText variant="label" color={colors.onPrimary} style={{ fontFamily: fonts.semibold }}>
                {t('loan.eligibilityTitle')}
              </ThemedText>
              {eligibility ? (
                <Badge
                  label={
                    eligibility.status === 'eligible'
                      ? t('loan.eligible')
                      : eligibility.status === 'checking'
                        ? t('loan.checking')
                        : t('loan.notEligible')
                  }
                  tone={eligibility.status === 'eligible' ? 'accent' : eligibility.status === 'checking' ? 'warning' : 'neutral'}
                />
              ) : null}
            </View>

            {eligibility?.status === 'eligible' ? (
              <>
                <ThemedText variant="tiny" color={colors.onPrimary} style={{ marginTop: spacing.lg, fontFamily: fonts.medium, opacity: 0.8 }}>
                  {t('loan.maxAmount')}
                </ThemedText>
                <ThemedText variant="display" weight="extrabold" color={colors.onPrimary} style={{ fontFamily: fonts.extrabold }}>
                  {formatMoney(eligibility.maxAmount)}
                </ThemedText>
                <Button
                  variant="accent"
                  label={t('loan.requestCta')}
                  onPress={() => setModalOpen(true)}
                  style={{ marginTop: spacing.lg }}
                />
              </>
            ) : (
              <ThemedText variant="caption" color={colors.onPrimary} style={{ marginTop: spacing.lg, fontFamily: fonts.regular, opacity: 0.8 }}>
                {eligibility?.reason ?? '—'}
              </ThemedText>
            )}
          </Card>

          <ThemedText variant="label" style={[styles.sectionTitle, { fontFamily: fonts.semibold }]}>
            {t('loan.pendingRequests')}
          </ThemedText>

          {requests.length === 0 ? (
            <Card>
              <ListEmptyState title={t('loan.noRequests')} icon="documents-outline" />
            </Card>
          ) : (
            requests.map(req => (
              <Card key={req.id} style={styles.requestCard}>
                <View style={styles.requestRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <ThemedText variant="body" weight="semibold" style={{ fontFamily: fonts.semibold }}>
                      {req.product}
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.textTertiary} style={{ fontFamily: fonts.medium }}>
                      {formatAmount(req.amount)} · {t('loan.months', { count: req.termMonths })}
                    </ThemedText>
                  </View>
                  <Badge label={statusLabel(req.status)} tone={statusTone(req.status)} />
                </View>
              </Card>
            ))
          )}
        </>
      )}

      <LoanRequestModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        products={products}
        onSubmit={async input => {
          const created = await api.submitLoanRequest(input);
          setRequests(prev => [created, ...prev]);
          setModalOpen(false);
          showAlert(t('loan.submitted'), t('loan.submittedHint'));
        }}
      />
    </Screen>
  );
}

interface LoanRequestModalProps {
  visible: boolean;
  onClose: () => void;
  products: LoanProduct[];
  onSubmit: (input: { productId: string; amount: number; termMonths: number }) => Promise<void>;
}

function LoanRequestModal({ visible, onClose, products, onSubmit }: LoanRequestModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fonts } = useLanguage();

  const [productId, setProductId] = useState('');
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState(12);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && products.length > 0 && !productId) {
      setProductId(products[0].id);
      setAmount('');
      setTerm(12);
    }
  }, [visible, products, productId]);

  const product = products.find(p => p.id === productId) ?? products[0];
  const numericAmount = parseFloat(amount) || 0;

  const monthly = (() => {
    if (!product || numericAmount <= 0) return 0;
    const rate = product.interestRate / 100 / 12;
    const factor = rate === 0 ? 1 : (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
    return numericAmount * factor;
  })();

  const submit = async () => {
    if (!product || numericAmount <= 0) return;
    setSubmitting(true);
    await onSubmit({ productId: product.id, amount: numericAmount, termMonths: term });
    setSubmitting(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[styles.modalSheet, { backgroundColor: colors.surface }]}
          onPress={e => e.stopPropagation()}
        >
          <ThemedText variant="subtitle" weight="bold" style={{ fontFamily: fonts.bold }}>
            {t('loan.requestTitle')}
          </ThemedText>

          <ThemedText variant="label" color={colors.textSecondary} style={styles.fieldLabel}>
            {t('loan.product')}
          </ThemedText>
          <View style={styles.chips}>
            {products.map(p => (
              <Pressable
                key={p.id}
                onPress={() => setProductId(p.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: p.id === productId ? colors.primarySoft : colors.surfaceAlt,
                    borderColor: p.id === productId ? colors.primary : colors.border,
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  weight="semibold"
                  color={p.id === productId ? colors.primary : colors.textSecondary}
                  style={{ fontFamily: fonts.semibold }}
                >
                  {p.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText variant="label" color={colors.textSecondary} style={styles.fieldLabel}>
            {t('loan.amount')}
          </ThemedText>
          <View style={[styles.amountWrap, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <ThemedText weight="semibold" color={colors.textSecondary} style={{ fontFamily: fonts.semibold }}>
              {t('common.currency')}
            </ThemedText>
            <TextInput
              value={amount}
              onChangeText={text => setAmount(text.replace(/[^\d.]/g, ''))}
              keyboardType="numeric"
              inputMode="numeric"
              placeholder={t('loan.enterAmount')}
              placeholderTextColor={colors.textTertiary}
              style={[styles.amountInput, { color: colors.text, fontFamily: fonts.medium }]}
            />
          </View>

          <ThemedText variant="label" color={colors.textSecondary} style={styles.fieldLabel}>
            {t('loan.term')}
          </ThemedText>
          <View style={styles.chips}>
            {TERMS.map(m => (
              <Pressable
                key={m}
                onPress={() => setTerm(m)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: m === term ? colors.primarySoft : colors.surfaceAlt,
                    borderColor: m === term ? colors.primary : colors.border,
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  weight="semibold"
                  color={m === term ? colors.primary : colors.textSecondary}
                  style={{ fontFamily: fonts.semibold }}
                >
                  {t('loan.months', { count: m })}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {numericAmount > 0 ? (
            <View style={[styles.installment, { backgroundColor: colors.primarySoft }]}>
              <ThemedText variant="caption" color={colors.textSecondary} style={{ fontFamily: fonts.medium }}>
                {t('loan.monthlyInstallment')}
              </ThemedText>
              <ThemedText variant="subtitle" weight="bold" color={colors.primary} style={{ fontFamily: fonts.bold }}>
                {formatMoney(monthly)}
              </ThemedText>
            </View>
          ) : null}

          <Button label={t('loan.submitRequest')} onPress={submit} loading={submitting} disabled={numericAmount <= 0} style={{ marginTop: spacing.md }} />
          <Button label={t('common.cancel')} variant="ghost" size="md" onPress={onClose} style={{ marginTop: spacing.sm }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  eligCard: {
    gap: spacing.xs,
    overflow: 'hidden',
  },
  heroDecor: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    right: -60,
    bottom: -70,
    opacity: 0.16,
  },
  eligHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  requestCard: {
    marginBottom: spacing.md,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xs,
  },
  fieldLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  amountInput: {
    flex: 1,
    fontSize: 17,
  },
  installment: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.md,
    gap: 2,
  },
});