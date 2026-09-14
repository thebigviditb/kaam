import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useMe, useRestoreMe, useUpdateMe } from '@/api/hooks';
import { useAuth } from '@/auth/AuthContext';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { FeedbackModal } from '@/components/FeedbackModal';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ShareButton } from '@/components/ShareButton';
import { confirm } from '@/components/notify';
import { Button, Card, Divider, Screen, Section } from '@/components/ui';
import { useI18n } from '@/i18n';
import { displayPhone } from '@/lib/phone';
import { parseServerDate } from '@/lib/time';
import { colors, radius, spacing, text } from '@/theme';

export function SettingsScreen() {
  const { t, label, lang } = useI18n();
  const auth = useAuth();
  const me = useMe();
  const updateMe = useUpdateMe();
  const restoreMe = useRestoreMe();
  const qc = useQueryClient();
  const router = useRouter();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const signOutToWelcome = async () => {
    await auth.signOut();
    qc.clear();
    router.replace('/(auth)/welcome');
  };

  const logOut = async () => {
    if (!(await confirm(t('settings.confirmLogOut'), { ok: t('settings.logOut'), cancel: t('common.cancel') })))
      return;
    await signOutToWelcome();
  };

  const scheduledFor = me.data?.deletion_scheduled_for ?? null;
  const scheduledDate = scheduledFor
    ? parseServerDate(scheduledFor).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const email = me.data?.email ?? auth.email;
  return (
    <Screen title={t('settings.title')}>
      <Card style={s.shareCard}>
        <Text style={text.h3}>{t('share.title')}</Text>
        <Text style={text.muted}>{t('share.hint')}</Text>
        <ShareButton style={{ marginTop: spacing.xs }} />
      </Card>
      <Card style={s.shareCard}>
        <Text style={text.h3}>{t('feedback.title')}</Text>
        <Text style={text.muted}>{t('feedback.hint')}</Text>
        <Button title={t('feedback.button')} variant="secondary" onPress={() => setFeedbackOpen(true)} style={{ marginTop: spacing.xs }} />
      </Card>
      <FeedbackModal visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} page="settings" />
      <Section title={t('common.language')}>
        <LanguageToggle onChange={(l) => updateMe.mutate({ preferred_language: l })} />
      </Section>
      <Section title={t('settings.account')}>
        <Card>
          <View style={s.row}>
            <Text style={text.muted}>{t('common.phone')}</Text>
            <Text style={text.body}>{me.data?.phone ? displayPhone(me.data.phone) : '—'}</Text>
          </View>
          {email ? (
            <>
              <Divider />
              <View style={s.row}>
                <Text style={text.muted}>{t('common.email')}</Text>
                <Text style={text.body}>{email}</Text>
              </View>
            </>
          ) : null}
          <Divider />
          <View style={s.row}>
            <Text style={text.muted}>{t('settings.role')}</Text>
            <Text style={text.body}>{label('roles', me.data?.role)}</Text>
          </View>
        </Card>
      </Section>
      <Button title={t('settings.logOut')} variant="danger" onPress={logOut} style={{ marginTop: spacing.lg }} />
      <View style={s.dangerZone} testID="delete-account-section">
        <Text style={s.dangerTitle}>{t('deleteAccount.title')}</Text>
        {scheduledDate ? (
          <>
            <Text style={text.muted}>{t('deleteAccount.scheduled', { date: scheduledDate })}</Text>
            <Button
              title={t('deleteAccount.keep')}
              variant="secondary"
              onPress={() => restoreMe.mutate()}
              loading={restoreMe.isPending}
              style={{ marginTop: spacing.xs }}
            />
          </>
        ) : (
          <>
            <Text style={text.muted}>{t('deleteAccount.hint')}</Text>
            <Button
              title={t('deleteAccount.button')}
              variant="ghost"
              onPress={() => setDeleteOpen(true)}
              style={s.deleteButton}
            />
          </>
        )}
      </View>
      <DeleteAccountModal visible={deleteOpen} onClose={() => setDeleteOpen(false)} onDeleted={signOutToWelcome} />
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  shareCard: { gap: spacing.sm },
  dangerZone: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  dangerTitle: { fontSize: 13, fontWeight: '600', color: colors.danger },
  deleteButton: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    borderRadius: radius,
  },
});
