import { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ThemedText } from '@/components/ThemedText';
import { PinPad } from '@/components/PinPad';
import { formatPhone } from '@/lib/format';
import { confirmAction } from '@/lib/alert';
import { radii, spacing } from '@/theme';
import { supportedLanguages } from '@/i18n';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors, mode, setMode } = useTheme();
  const { fonts, language, followDevice, setLanguage, setFollowDevice } = useLanguage();
  const auth = useAuth();

  const [changePinOpen, setChangePinOpen] = useState(false);

  const confirmLogout = () => {
    confirmAction({
      title: t('settings.logout'),
      message: t('settings.logoutConfirm'),
      confirmLabel: t('settings.logout'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => auth.logout(),
    });
  };

  return (
    <Screen scroll contentContainerStyle={{ paddingBottom: 120 }}>
      <ThemedText variant="title" weight="bold" style={[styles.pageTitle, { fontFamily: fonts.bold }]}>
        {t('settings.title')}
      </ThemedText>

      <Card style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <ThemedText weight="extrabold" color={colors.primary} style={{ fontFamily: fonts.extrabold }}>
            {auth.profile?.fullName?.[0]}
          </ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="label" weight="bold" style={{ fontFamily: fonts.bold }}>
            {auth.profile?.fullName}
          </ThemedText>
          <ThemedText variant="caption" color={colors.textTertiary} style={{ fontFamily: fonts.medium }}>
            {formatPhone(auth.profile?.phone ?? '')}
          </ThemedText>
        </View>
      </Card>

      <ThemedText variant="caption" color={colors.textTertiary} style={styles.sectionLabel}>
        {t('settings.preferences')}
      </ThemedText>
      <Card padded={false} style={styles.group}>
        <SettingRow
          icon="language-outline"
          label={t('settings.language')}
          value={
            followDevice
              ? t('language.followDevice')
              : language === 'am'
                ? t('language.amharic')
                : t('language.english')
          }
          onPress={() => {}}
        />
        <View style={styles.inlineOptions}>
          <Pressable
            onPress={() => setFollowDevice(true)}
            style={[
              styles.optionChip,
              { backgroundColor: followDevice ? colors.primarySoft : colors.surfaceAlt, borderColor: followDevice ? colors.primary : colors.border },
            ]}
          >
            <ThemedText variant="caption" weight="semibold" color={followDevice ? colors.primary : colors.textSecondary} style={{ fontFamily: fonts.semibold }}>
              {t('language.followDevice')}
            </ThemedText>
          </Pressable>
          {(supportedLanguages as readonly string[]).map(code => (
            <Pressable
              key={code}
              onPress={() => setLanguage(code as 'en' | 'am')}
              style={[
                styles.optionChip,
                {
                  backgroundColor: !followDevice && language === code ? colors.primarySoft : colors.surfaceAlt,
                  borderColor: !followDevice && language === code ? colors.primary : colors.border,
                },
              ]}
            >
              <ThemedText
                variant="caption"
                weight="semibold"
                color={!followDevice && language === code ? colors.primary : colors.textSecondary}
                style={{ fontFamily: fonts.semibold }}
              >
                {code === 'am' ? t('language.amharic') : t('language.english')}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="moon-outline"
          label={t('settings.theme')}
          value={
            mode === 'system'
              ? t('settings.themeSystem')
              : mode === 'dark'
                ? t('settings.themeDark')
                : t('settings.themeLight')
          }
        />
        <View style={styles.inlineOptions}>
          {(['system', 'light', 'dark'] as const).map(option => (
            <Pressable
              key={option}
              onPress={() => setMode(option)}
              style={[
                styles.optionChip,
                {
                  backgroundColor: mode === option ? colors.primarySoft : colors.surfaceAlt,
                  borderColor: mode === option ? colors.primary : colors.border,
                },
              ]}
            >
              <ThemedText
                variant="caption"
                weight="semibold"
                color={mode === option ? colors.primary : colors.textSecondary}
                style={{ fontFamily: fonts.semibold }}
              >
                {option === 'system'
                  ? t('settings.themeSystem')
                  : option === 'dark'
                    ? t('settings.themeDark')
                    : t('settings.themeLight')}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Card>

      <ThemedText variant="caption" color={colors.textTertiary} style={styles.sectionLabel}>
        {t('settings.security')}
      </ThemedText>
      <Card padded={false} style={styles.group}>
        <View style={styles.row}>
          <View style={[styles.iconChip, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="finger-print-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" weight="semibold" style={{ fontFamily: fonts.semibold }}>
              {t('settings.biometrics')}
            </ThemedText>
            <ThemedText variant="tiny" color={colors.textTertiary} style={{ fontFamily: fonts.medium }}>
              {auth.biometricsAvailable ? t('settings.biometricsHint') : t('settings.biometricsUnavailable')}
            </ThemedText>
          </View>
          <Switch
            value={auth.biometricsEnabled}
            onValueChange={enabled => (enabled ? auth.enableBiometrics() : auth.disableBiometrics())}
            disabled={!auth.biometricsAvailable}
            trackColor={{ true: colors.accent, false: colors.disabled }}
            thumbColor="#ffffff"
          />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow icon="key-outline" label={t('settings.changePin')} onPress={() => setChangePinOpen(true)} chevron />
      </Card>

      <ThemedText variant="caption" color={colors.textTertiary} style={styles.sectionLabel}>
        {t('settings.about')}
      </ThemedText>
      <Card padded={false} style={styles.group}>
        <SettingRow icon="information-circle-outline" label={t('common.appName')} value={t('settings.version')} />
      </Card>

      <Button label={t('settings.logout')} variant="danger" size="md" onPress={confirmLogout} style={styles.logoutBtn} />

      <ChangePinModal visible={changePinOpen} onClose={() => setChangePinOpen(false)} onDone={() => setChangePinOpen(false)} />
    </Screen>
  );
}

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
}

function SettingRow({ icon, label, value, onPress, chevron }: SettingRowProps) {
  const { colors } = useTheme();
  const { fonts } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      <View style={[styles.iconChip, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <ThemedText variant="body" weight="semibold" style={[styles.rowLabel, { fontFamily: fonts.semibold }]}>
        {label}
      </ThemedText>
      {value ? (
        <ThemedText variant="caption" color={colors.textTertiary} style={{ fontFamily: fonts.medium }}>
          {value}
        </ThemedText>
      ) : null}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} /> : null}
    </Pressable>
  );
}

function ChangePinModal({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fonts } = useLanguage();
  const [pin, setPin] = useState('');

  const filled = async (value: string) => {
    await new Promise(r => setTimeout(r, 600));
    void value;
    setPin('');
    onDone();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
          <ThemedText variant="subtitle" weight="bold" style={{ fontFamily: fonts.bold }}>
            {t('settings.changePin')}
          </ThemedText>
          <ThemedText variant="caption" color={colors.textTertiary} style={{ fontFamily: fonts.medium }}>
            {t('setPin.subtitle')}
          </ThemedText>
          <PinPad
            value={pin}
            onChange={setPin}
            onFilled={filled}
            length={4}
          />
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  group: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    minHeight: 56,
  },
  rowLabel: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 46,
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  logoutBtn: {
    marginTop: spacing.xxl,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
});