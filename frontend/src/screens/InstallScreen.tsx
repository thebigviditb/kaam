import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { keys, useMe, useUpdateMe } from '@/api/hooks';
import { InstallGuide } from '@/components/InstallGuide';
import { QrCode } from '@/components/QrCode';
import { Loading } from '@/components/ui';
import { WizardStep } from '@/components/Wizard';
import { useI18n } from '@/i18n';
import { installTarget } from '@/lib/install';
import { requestPushOnGesture } from '@/lib/push';
import { queueMatchesWelcome } from '@/screens/MatchesScreen';
import { colors, radius, spacing, text } from '@/theme';

const POLL_MS = 4000;

/**
 * Last onboarding step, kept on the account as `install_pending` until it is done:
 * on a phone, the steps to add Kaam to the Home Screen; on a laptop, a QR code to carry on
 * there (the phone's next login lands back here). Skip, or opening Kaam from the Home Screen,
 * clears it. A laptop polls /me so it moves on by itself once the phone is done.
 */
export function InstallScreen() {
  const { t } = useI18n();
  const me = useMe();
  const updateMe = useUpdateMe();
  const qc = useQueryClient();
  const router = useRouter();
  const [target] = useState(installTarget);
  const [error, setError] = useState<string | null>(null);

  const role = me.data?.role;
  const pending = me.data?.install_pending;

  // Cleared elsewhere (Skip on the phone, or the Home Screen app): move on.
  useEffect(() => {
    if (role && pending === false) router.replace(role === 'worker' ? '/(worker)/matches' : '/(customer)/matches');
  }, [role, pending, router]);

  useEffect(() => {
    if (target !== 'desktop') return;
    const id = setInterval(() => qc.invalidateQueries({ queryKey: keys.me }), POLL_MS);
    return () => clearInterval(id);
  }, [target, qc]);

  if (!role || !target) return <Loading />;

  const done = async () => {
    requestPushOnGesture();
    setError(null);
    try {
      await queueMatchesWelcome();
      await updateMe.mutateAsync({ install_pending: false });
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  const skip = { label: t('common.skip'), onPress: done };

  if (target === 'desktop') {
    const url = `${window.location.origin}/log-in`;
    return (
      <WizardStep step={7} total={7} title={t('install.qrTitle')} hint={t('install.qrHint')} error={error} secondary={skip}>
        <View style={s.qrCard} testID="install-qr">
          <QrCode value={url} size={300} label={t('install.qrTitle')} />
          <Text style={[text.body, s.center]}>{t('install.qrUrl', { url: window.location.host })}</Text>
        </View>
        <View style={s.waiting}>
          <ActivityIndicator color={colors.accent} />
          <Text style={text.muted}>{t('install.qrWaiting')}</Text>
        </View>
      </WizardStep>
    );
  }
  return (
    <WizardStep
      step={7}
      total={7}
      title={t('install.title')}
      hint={t('install.hint')}
      error={error}
      onNext={done}
      nextLabel={t(role === 'worker' ? 'onb.w.finish' : 'onb.c.finish')}
      nextLoading={updateMe.isPending}
      secondary={skip}>
      <InstallGuide browser={target} />
    </WizardStep>
  );
}

const s = StyleSheet.create({
  qrCard: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    alignSelf: 'center',
  },
  center: { textAlign: 'center' },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
