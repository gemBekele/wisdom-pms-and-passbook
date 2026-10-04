import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { ThemedText } from '@/components/ThemedText';
import { OTPInput } from '@/components/OTPInput';
import { spacing } from '@/theme';
import { formatPhone } from '@/lib/format';

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fonts } = useLanguage();
  const router = useRouter();
  const auth = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setCooldown(c => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const verify = async (value: string) => {
    if (verifying || value.length !== OTP_LENGTH) return;
    setVerifying(true);
    setError(false);
    try {
      const needsPin = await auth.verifyOtp(value);
      if (needsPin) router.replace('/(auth)/set-pin');
    } catch {
      setCode('');
      setError(true);
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    await auth.requestOtp(auth.phone);
    setCode('');
    setError(false);
    setCooldown(60);
  };

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="title" style={[styles.title, { fontFamily: fonts.bold }]}>
            {t('otp.title')}
          </ThemedText>
          <ThemedText variant="body" color={colors.textSecondary} style={[styles.body, { fontFamily: fonts.regular }]}>
            {t('otp.body')}
          </ThemedText>
          <ThemedText weight="semibold" color={colors.text} style={{ fontFamily: fonts.semibold }}>
            {formatPhone(auth.phone)}
          </ThemedText>
        </View>

        <OTPInput
          length={OTP_LENGTH}
          value={code}
          onChange={v => {
            setCode(v);
            setError(false);
          }}
          onFilled={verify}
          error={error}
        />

        {error ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.error}>
            {t('otp.wrong')}
          </ThemedText>
        ) : null}

        <View style={styles.resend}>
          {cooldown > 0 ? (
            <ThemedText variant="caption" color={colors.textTertiary} style={{ fontFamily: fonts.medium }}>
              {t('otp.resendIn', { seconds: cooldown })}
            </ThemedText>
          ) : (
            <Button label={t('otp.resend')} variant="ghost" size="md" fullWidth={false} onPress={resend} />
          )}
        </View>

        <Button label={t('common.continue')} onPress={() => verify(code)} loading={verifying} disabled={code.length !== OTP_LENGTH} style={styles.continueBtn} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.xxxl,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 28,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    lineHeight: 22,
  },
  error: {
    textAlign: 'center',
    marginTop: -spacing.md,
  },
  resend: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  continueBtn: {
    marginTop: 'auto',
    marginBottom: spacing.lg,
  },
});