import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { useI18n } from '@/i18n';
import { enablePush, usePushPrompt } from '@/lib/push';
import { colors, radius, spacing, text } from '@/theme';

/**
 * One-time "Get notified when someone messages you" bar for the top of Connections. Shows
 * only where push can work without extra steps (installed PWA or Android browser) and the
 * user has not answered the permission prompt yet. Dismissing snoozes it for 30 days.
 */
export function PushPromptBanner() {
  const { t } = useI18n();
  const { show, dismiss } = usePushPrompt();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  if (!show) return null;
  const turnOn = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await enablePush();
    } catch {
      // the Settings card explains failures; keep the banner quiet
    } finally {
      inFlight.current = false;
      setBusy(false);
      dismiss();
    }
  };
  return (
    <View style={s.banner} testID="push-prompt">
      <Ionicons name="notifications-outline" size={20} color={colors.accent} />
      <Text style={[text.body, s.message]}>{t('push.prompt')}</Text>
      <Button title={t('push.turnOn')} small loading={busy} onPress={() => void turnOn()} />
      <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={8}>
        <Ionicons name="close" size={20} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    marginBottom: spacing.md,
  },
  message: { flex: 1, fontSize: 14, lineHeight: 19 },
});
