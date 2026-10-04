import { Alert, Platform } from 'react-native';

// react-native-web does not implement Alert, so fall back to the browser APIs.

export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmAction(options: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(options.message)) options.onConfirm();
    return;
  }
  Alert.alert(options.title, options.message, [
    { text: options.cancelLabel, style: 'cancel' },
    { text: options.confirmLabel, style: 'destructive', onPress: options.onConfirm },
  ]);
}
