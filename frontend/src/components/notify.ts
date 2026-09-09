import { Alert, Platform } from 'react-native';

/** Cross-platform alert: window.alert on web (RN-web has no Alert), Alert on native. */
export function notify(message: string, title?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(title ? `${title}\n\n${message}` : message);
    return;
  }
  Alert.alert(title ?? '', message);
}

export function confirm(message: string, opts: { ok: string; cancel: string }): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(message) : false);
  }
  return new Promise((resolve) => {
    Alert.alert('', message, [
      { text: opts.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: opts.ok, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
