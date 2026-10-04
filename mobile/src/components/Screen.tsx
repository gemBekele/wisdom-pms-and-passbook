import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  keyboard?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, scroll = false, padded = true, keyboard = false, contentContainerStyle }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const baseStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
  };

  const pad: ViewStyle = padded ? { paddingHorizontal: spacing.lg } : {};

  const inner = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.scrollContent, pad, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, pad, contentContainerStyle]}>{children}</View>
  );

  if (!keyboard) {
    return <View style={baseStyle}>{inner}</View>;
  }

  return (
    <KeyboardAvoidingView
      style={baseStyle}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}
    >
      {inner}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
});