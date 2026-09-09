import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';

import { errorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { notify } from '@/components/notify';
import { Button, Field, InlineMessage, Input, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { spacing } from '@/theme';

export default function Verify() {
  const { t } = useI18n();
  const { confirmSignUp, resendCode } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim()) return setError(t('auth.emailRequired'));
    if (!code.trim()) return setError(t('auth.codeRequired'));
    setBusy(true);
    try {
      await confirmSignUp(email, code);
      notify(t('auth.verified'));
      router.replace({ pathname: '/(auth)/log-in', params: { email: email.trim() } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await resendCode(email);
      setInfo(t('auth.codeResent'));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen title={t('auth.verifyTitle')} subtitle={t('auth.verifySubtitle', { email: email || '…' })}>
      {error ? <InlineMessage message={error} /> : null}
      {info ? <InlineMessage message={info} tone="success" /> : null}
      {!params.email ? (
        <Field label={t('common.email')}>
          <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        </Field>
      ) : null}
      <Field label={t('auth.code')}>
        <Input value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" />
      </Field>
      <Button title={t('auth.verify')} onPress={submit} loading={busy} />
      <Button title={t('auth.resendCode')} variant="ghost" onPress={resend} style={{ marginTop: spacing.sm }} />
    </Screen>
  );
}
