import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Card, InlineMessage, Toggle } from '@/components/ui';
import { useI18n } from '@/i18n';
import { disablePush, enablePush, isIOS, isStandalone, usePushStatus } from '@/lib/push';
import { spacing, text } from '@/theme';

/**
 * Settings card for web push. Renders nothing where push can't work at all; on iPhone
 * Safari (not installed) explains the Home Screen step instead of showing a toggle.
 */
export function NotificationsCard({ style }: { style?: ViewStyle }) {
  const { t } = useI18n();
  const status = usePushStatus();
  const [busy, setBusy] = useState(false);
  // The Toggle's Pressable and Switch can both fire on one web click; state alone is too slow to dedupe.
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const iosBrowser = isIOS() && !isStandalone();
  if (!status.supported && !iosBrowser) return null;

  const onChange = async (on: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      if (on) {
        const result = await enablePush();
        if (result !== 'granted') setError(t(result === 'denied' ? 'push.blocked' : 'push.error'));
      } else {
        await disablePush();
      }
    } catch {
      setError(t('push.error'));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <Card style={StyleSheet.flatten([s.card, style])}>
      <Text style={text.h3} testID="notifications-card">
        {t('push.title')}
      </Text>
      {iosBrowser ? (
        <Text style={text.muted}>{t('push.iosHint')}</Text>
      ) : status.permission === 'denied' ? (
        <Text style={text.muted}>{t('push.blocked')}</Text>
      ) : (
        <View style={busy && { opacity: 0.6 }}>
          <Toggle label={t('push.toggle')} value={status.subscribed} onChange={(v) => void onChange(v)} />
        </View>
      )}
      {error ? <InlineMessage message={error} /> : null}
    </Card>
  );
}

const s = StyleSheet.create({
  card: { gap: spacing.sm },
});
