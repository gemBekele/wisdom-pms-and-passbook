import { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { PinPad } from '@/components/PinPad';
import { spacing } from '@/theme';

const PIN_LENGTH = 4;

type PinError = '' | 'mismatch' | 'failed';

export default function SetPinScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fonts } = useLanguage();
  const auth = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<PinError>('');
  const [saving, setSaving] = useState(false);
  // Compare against a ref so the confirmation never sees a stale state value.
  const pinRef = useRef('');

  const resetToStart = () => {
    setPin('');
    setConfirm('');
    pinRef.current = '';
    setTimeout(() => {
      setStep(1);
      setError('');
    }, 900);
  };

  const onFilled = async (value: string) => {
    if (step === 1) {
      pinRef.current = value;
      setPin(value);
      setConfirm('');
      setStep(2);
      return;
    }

    if (value !== pinRef.current) {
      setError('mismatch');
      resetToStart();
      return;
    }

    if (saving) return;
    setSaving(true);
    try {
      await auth.setPin(value);
    } catch {
      setError('failed');
      resetToStart();
    } finally {
      setSaving(false);
    }
  };

  const title = step === 1 ? t('setPin.title') : t('setPin.confirmTitle');
  const subtitle = step === 1 ? t('setPin.subtitle') : t('setPin.confirmSubtitle');

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="title" style={[styles.title, { fontFamily: fonts.bold }]}>
            {title}
          </ThemedText>
          <ThemedText variant="body" color={colors.textSecondary} style={[styles.subtitle, { fontFamily: fonts.regular }]}>
            {subtitle}
          </ThemedText>
          {step === 2 ? (
            <ThemedText variant="caption" color={colors.textTertiary} style={{ fontFamily: fonts.medium }}>
              {pin.replace(/./g, '\u2022')}
            </ThemedText>
          ) : null}
        </View>

        <PinPad
          length={PIN_LENGTH}
          value={step === 1 ? pin : confirm}
          onChange={v => {
            if (step === 1) setPin(v);
            else setConfirm(v);
            if (error) setError('');
          }}
          onFilled={onFilled}
          error={error !== ''}
          disabled={saving}
        />

        {error ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.error}>
            {error === 'mismatch' ? t('setPin.mismatch') : t('setPin.saveFailed')}
          </ThemedText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
    lineHeight: 22,
  },
  error: {
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
