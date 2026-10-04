import { useMemo, useState } from 'react';
import { View, TextInput, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { ThemedText } from '@/components/ThemedText';
import { LogoMark } from '@/components/LogoMark';
import { PinPad } from '@/components/PinPad';
import { spacing, radii, appBrand } from '@/theme';
import { formatPhone } from '@/lib/format';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fonts } = useLanguage();
  const router = useRouter();
  const auth = useAuth();

  const returning = auth.hasPin && auth.phone.length > 0;

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [attempts, setAttempts] = useState(3);
  const [loggingIn, setLoggingIn] = useState(false);

  const phoneValid = useMemo(() => phone.replace(/\D/g, '').length === 9, [phone]);

  const submitPhone = async () => {
    if (!phoneValid) {
      setPhoneError(true);
      return;
    }
    setSubmitting(true);
    await auth.requestOtp(formatPhone(phone));
    setSubmitting(false);
    router.push('/(auth)/otp');
  };

  const onPinFilled = async (value: string) => {
    if (loggingIn) return;
    setLoggingIn(true);
    try {
      await auth.loginWithPin(value);
    } catch {
      setPin('');
      const next = attempts - 1;
      setAttempts(next);
      setPinError(next <= 0);
    } finally {
      setLoggingIn(false);
    }
  };

  const onBiometrics = async () => {
    await auth.loginWithBiometrics();
  };

  return (
    <Screen scroll keyboard>
      <View style={styles.content}>
        <View style={styles.brand}>
          <View style={styles.hero}>
            <View style={[styles.heroCardBack, { backgroundColor: colors.accent }]} />
            <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
              <View style={[styles.heroChip, { backgroundColor: colors.accent }]} />
              <View style={[styles.heroLine, { backgroundColor: colors.onPrimary, width: 70 }]} />
              <View style={[styles.heroLine, { backgroundColor: colors.onPrimary, width: 44 }]} />
            </View>
            <View style={styles.heroBadge}>
              <LogoMark size={44} />
            </View>
          </View>
          <ThemedText variant="title" weight="extrabold" style={[styles.appName, { fontFamily: fonts.extrabold }]}>
            {t('common.appName')}
          </ThemedText>
          <ThemedText variant="caption" color={colors.textTertiary} style={[styles.tagline, { fontFamily: fonts.medium }]}>
            {appBrand.tagline}
          </ThemedText>
        </View>

        {returning ? (
          <View style={styles.form}>
            <ThemedText variant="title" style={[styles.title, { fontFamily: fonts.bold }]}>
              {t('login.title')}
            </ThemedText>
            <ThemedText variant="caption" color={colors.textTertiary} style={[styles.subtitle, { fontFamily: fonts.medium }]}>
              {formatPhone(auth.phone)}
            </ThemedText>
            <PinPad
              value={pin}
              onChange={v => {
                setPin(v);
                setPinError(false);
              }}
              onFilled={onPinFilled}
              error={pinError}
              disabled={loggingIn}
              showBiometrics={auth.biometricsEnabled && auth.biometricsAvailable}
              onBiometrics={onBiometrics}
            />
            {loggingIn ? (
              <View style={styles.signingIn}>
                <ActivityIndicator color={colors.primary} />
                <ThemedText variant="caption" color={colors.textTertiary} style={{ fontFamily: fonts.medium }}>
                  {t('login.signingIn')}
                </ThemedText>
              </View>
            ) : null}
            {pinError ? (
              <ThemedText variant="caption" color={colors.danger} style={styles.errorText}>
                {attempts <= 0 ? t('login.locked') : t('login.error', { attempts })}
              </ThemedText>
            ) : null}
            <Pressable onPress={() => auth.forgotPin()} style={styles.forgot}>
              <ThemedText variant="caption" color={colors.primary} style={{ fontFamily: fonts.medium }}>
                {t('login.forgot')}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={async () => {
                setPin('');
                // Clear the saved PIN/number so the phone-entry form shows.
                await auth.forgotPin();
              }}
              style={styles.anotherNumber}
            >
              <ThemedText variant="caption" color={colors.textTertiary} style={{ fontFamily: fonts.medium }}>
                {t('welcome.anotherNumber')}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <ThemedText variant="title" style={[styles.title, { fontFamily: fonts.bold }]}>
              {t('welcome.greeting')}
            </ThemedText>
            <ThemedText variant="body" color={colors.textSecondary} style={[styles.subtitle, { fontFamily: fonts.regular }]}>
              {t('welcome.subtitle')}
            </ThemedText>

            <ThemedText variant="label" color={colors.textSecondary} style={styles.phoneLabel}>
              {t('welcome.phoneLabel')}
            </ThemedText>
            <View
              style={[
                styles.phoneInputWrap,
                {
                  backgroundColor: colors.surface,
                  borderColor: phoneError ? colors.danger : colors.border,
                },
              ]}
            >
              <ThemedText weight="semibold" color={colors.text} style={{ fontFamily: fonts.semibold }}>
                {t('welcome.countryCode')}
              </ThemedText>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TextInput
                value={phone}
                onChangeText={text => {
                  setPhone(text.replace(/\D/g, '').slice(0, 9));
                  setPhoneError(false);
                }}
                keyboardType="phone-pad"
                inputMode="tel"
                placeholder="9__ ___ ____"
                placeholderTextColor={colors.textTertiary}
                style={[styles.phoneInput, { color: colors.text, fontFamily: fonts.medium }]}
                autoFocus
              />
            </View>
            {phoneError ? (
              <ThemedText variant="caption" color={colors.danger} style={styles.errorText}>
                {t('welcome.invalidPhone')}
              </ThemedText>
            ) : null}

            <Button
              label={t('welcome.sendCode')}
              onPress={submitPhone}
              loading={submitting}
              disabled={!phoneValid}
            />

            <View style={styles.privacyRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.textTertiary} />
              <ThemedText variant="tiny" color={colors.textTertiary} style={styles.privacy}>
                {t('welcome.privacy')}
              </ThemedText>
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  hero: {
    width: 210,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  heroCardBack: {
    position: 'absolute',
    width: 150,
    height: 96,
    borderRadius: 18,
    transform: [{ rotate: '-9deg' }, { translateX: -14 }, { translateY: -4 }],
  },
  heroCard: {
    width: 150,
    height: 96,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
  },
  heroChip: {
    width: 32,
    height: 22,
    borderRadius: 6,
  },
  heroLine: {
    height: 8,
    borderRadius: 4,
    opacity: 0.35,
  },
  heroBadge: {
    position: 'absolute',
    right: 14,
    bottom: 2,
  },
  appName: {
    marginTop: spacing.lg,
  },
  tagline: {
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.lg,
  },
  title: {
    fontSize: 30,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: -spacing.sm,
  },
  phoneLabel: {
    marginTop: spacing.md,
  },
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  divider: {
    width: 1,
    height: 24,
  },
  phoneInput: {
    flex: 1,
    fontSize: 18,
  },
  errorText: {
    marginTop: -spacing.sm,
    textAlign: 'center',
  },
  signingIn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  privacy: {
    flexShrink: 1,
    textAlign: 'center',
  },
  forgot: {
    alignItems: 'center',
  },
  anotherNumber: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});