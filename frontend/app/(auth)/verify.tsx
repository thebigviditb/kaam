import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

import { errorMessage } from '@/api/client';
import { authErrorKey, useAuth, type Contact } from '@/auth/AuthContext';
import { Button, Field, InlineMessage, Input, Screen } from '@/components/ui';
import { useI18n, type StringKey } from '@/i18n';
import { displayPhone } from '@/lib/phone';
import { spacing } from '@/theme';

/**
 * Shared code-entry screen after sign-up. On success the Gate routes onward.
 * - mode=confirmSignUp (email): answers the sign-up confirmation code, then auto-signs-in.
 * - mode=confirmSignIn (phone): answers the CUSTOM_AUTH (Twilio Verify) log-in challenge.
 */
export default function Verify() {
  const { t } = useI18n();
  const { confirmSignUp, resendSignUpCode, signIn, confirmSignIn } = useAuth();
  const params = useLocalSearchParams<{ username?: string; kind?: string; mode?: string }>();
  const username = params.username ?? '';
  const isPhone = params.kind === 'phone';
  const isSignIn = params.mode === 'confirmSignIn';
  const contact: Contact = { kind: isPhone ? 'phone' : 'email', value: username };
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const showError = (e: unknown) => {
    const key = authErrorKey(e);
    const m = errorMessage(e);
    if (key) return setError(t(key as StringKey));
    if (m.startsWith('auth.step:')) return setError(t('auth.unexpectedStep', { step: m.slice('auth.step:'.length) }));
    setError(m);
  };

  const submit = async () => {
    setError(null);
    if (!code.trim()) return setError(t('auth.codeRequired'));
    setBusy(true);
    setInfo(null);
    try {
      if (isSignIn) await confirmSignIn(code);
      else await confirmSignUp(username, code);
    } catch (e) {
      showError(e);
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    setInfo(null);
    setCode('');
    try {
      // For the custom challenge, "resend" means starting the sign-in over.
      if (isSignIn) await signIn(contact);
      else await resendSignUpCode(username);
      setInfo(t('auth.codeResent'));
    } catch (e) {
      showError(e);
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
