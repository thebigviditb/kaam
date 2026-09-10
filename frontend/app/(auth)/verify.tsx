import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

import { errorMessage } from '@/api/client';
import { authErrorKey, useAuth } from '@/auth/AuthContext';
import { Button, Field, InlineMessage, Input, Screen } from '@/components/ui';
import { useI18n, type StringKey } from '@/i18n';
import { displayPhone } from '@/lib/phone';
import { spacing } from '@/theme';

/** Sign-up confirmation code. On success Amplify auto-signs-in and the Gate routes onward. */
export default function Verify() {
  const { t } = useI18n();
  const { confirmSignUp, resendSignUpCode } = useAuth();
  const params = useLocalSearchParams<{ username?: string; kind?: string }>();
  const username = params.username ?? '';
  const isPhone = params.kind === 'phone';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!code.trim()) return setError(t('auth.codeRequired'));
    setBusy(true);
    try {
      await confirmSignUp(username, code);
    } catch (e) {
      const key = authErrorKey(e);
      setError(key ? t(key as StringKey) : errorMessage(e));
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await resendSignUpCode(username);
      setInfo(t('auth.codeResent'));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const to = isPhone ? displayPhone(username) : username;
  return (
    <Screen
      title={t('auth.codeTitle')}
      subtitle={isPhone ? t('auth.codeSentPhone', { to }) : t('auth.codeSentEmail', { to })}>
      {error ? <InlineMessage message={error} /> : null}
      {info ? <InlineMessage message={info} tone="success" /> : null}
      <Field label={t('auth.code')}>
        <Input
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          onSubmitEditing={submit}
          autoFocus
        />
      </Field>
      <Button title={t('auth.verify')} onPress={submit} loading={busy} />
      <Button title={t('auth.resendCode')} variant="ghost" onPress={resend} style={{ marginTop: spacing.sm }} />
    </Screen>
  );
}
