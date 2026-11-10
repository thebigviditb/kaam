import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ShareButton } from '@/components/ShareButton';
import { useI18n } from '@/i18n';
import { colors, radius, spacing, text } from '@/theme';

const KEY = 'kaam.shareBannerDismissedAt';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Slim "Know somebody who…? Share Kaam." bar for the top of Matches. Dismissing hides it
 * for 14 days (timestamp in AsyncStorage), after which it returns.
 */
export function ShareBanner({ role }: { role: 'worker' | 'customer' }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        const at = v ? Number(v) : NaN;
        setShow(!Number.isFinite(at) || Date.now() - at > SNOOZE_MS);
      })
      .catch(() => setShow(true));
  }, []);

  if (!show) return null;
  const dismiss = () => {
    setShow(false);
    AsyncStorage.setItem(KEY, String(Date.now())).catch(() => {});
  };
  return (
    <View style={s.banner} testID="share-banner">
      <Text style={[text.body, s.message]}>
        {t(role === 'worker' ? 'share.bannerWorker' : 'share.bannerCustomer')}
      </Text>
      <ShareButton compact />
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
