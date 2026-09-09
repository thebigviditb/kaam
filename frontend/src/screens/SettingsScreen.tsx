import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useMe, useUpdateMe } from '@/api/hooks';
import { useAuth } from '@/auth/AuthContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { confirm } from '@/components/notify';
import { Button, Card, Divider, Screen, Section } from '@/components/ui';
import { useI18n } from '@/i18n';
import { spacing, text } from '@/theme';

export function SettingsScreen() {
  const { t, label } = useI18n();
  const auth = useAuth();
  const me = useMe();
  const updateMe = useUpdateMe();
  const qc = useQueryClient();
  const router = useRouter();

  const logOut = async () => {
    if (!(await confirm(t('settings.confirmLogOut'), { ok: t('settings.logOut'), cancel: t('common.cancel') })))
      return;
    await auth.signOut();
    qc.clear();
    router.replace('/(auth)/welcome');
  };

  return (
    <Screen title={t('settings.title')}>
      <Section title={t('common.language')}>
        <LanguageToggle onChange={(l) => updateMe.mutate({ preferred_language: l })} />
      </Section>
      <Section title={t('settings.account')}>
        <Card>
          <View style={s.row}>
            <Text style={text.muted}>{t('common.email')}</Text>
            <Text style={text.body}>{me.data?.email ?? auth.email ?? '—'}</Text>
          </View>
          <Divider />
          <View style={s.row}>
            <Text style={text.muted}>{t('settings.role')}</Text>
            <Text style={text.body}>{label('roles', me.data?.role)}</Text>
          </View>
          {me.data?.phone ? (
            <>
              <Divider />
              <View style={s.row}>
                <Text style={text.muted}>{t('common.phone')}</Text>
                <Text style={text.body}>{me.data.phone}</Text>
              </View>
            </>
          ) : null}
        </Card>
      </Section>
      <Button title={t('settings.logOut')} variant="danger" onPress={logOut} style={{ marginTop: spacing.lg }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
});
