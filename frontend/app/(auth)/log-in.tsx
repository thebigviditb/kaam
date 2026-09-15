import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { authErrorKey, useAuth } from '@/auth/AuthContext';
import { Brand, SmsConsent } from '@/components/Brand';
import { PhoneInput } from '@/components/PhoneInput';
import { Button, Field, InlineMessage, Input, Screen } from '@/components/ui';
import { useI18n, type StringKey } from '@/i18n';
import { displayPhone, isValidUSPhone, toE164 } from '@/lib/phone';
import { colors, spacing, text } from '@/theme';

export default function LogIn() {
  const { devBypass } = useAuth();
  return devBypass ? <DevLogin /> : <CognitoLogin />;
}

/** Passwordless log-in: phone number, then the texted code (Twilio Verify custom challenge). */
function CognitoLogin() {
  const { t } = useI18n();
  const { signIn, confirmSignIn } = useAuth();
  const [digits, setDigits] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
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

  const sendCode = async () => {
    setError(null);
    setInfo(null);
    if (!isValidUSPhone(digits)) return setError(t('auth.invalidPhone'));
    const e164 = toE164(digits);
    setBusy(true);
    try {
      await signIn(e164);
      setPhone(e164);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!phone) return;
    setError(null);
    setInfo(null);
    setCode('');
    try {
      // For the custom challenge, "resend" means starting the sign-in over.
      await signIn(phone);
      setInfo(t('auth.codeResent'));
    } catch (e) {
      showError(e);
    }
  };

  const verify = async () => {
    setError(null);
    if (!code.trim()) return setError(t('auth.codeRequired'));
    setBusy(true);
    try {
      await confirmSignIn(code);
      // The Gate in the root layout redirects once /me is loaded.
    } catch (e) {
      showError(e);
      setBusy(false);
    }
  };

  if (phone) {
    return (
      <Screen title={t('auth.codeTitle')} subtitle={t('auth.codeSentPhone', { to: displayPhone(phone) })}>
        <Brand />
        {error ? <InlineMessage message={error} /> : null}
        {info ? <InlineMessage message={info} tone="success" /> : null}
        <Field label={t('auth.code')}>
          <Input
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            onSubmitEditing={verify}
            autoFocus
          />
        </Field>
        <Button title={t('auth.verify')} onPress={verify} loading={busy} />
        <Button title={t('auth.resendCode')} variant="ghost" onPress={resend} style={{ marginTop: spacing.sm }} />
        <Button
          title={t('auth.useOther')}
          variant="ghost"
          onPress={() => {
            setPhone(null);
            setCode('');
            setError(null);
            setInfo(null);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen title={t('auth.logInTitle')} subtitle={t('auth.logInSubtitle')}>
      <Brand />
      {error ? <InlineMessage message={error} /> : null}
      <Field label={t('common.phone')}>
        <PhoneInput value={digits} onChange={setDigits} onSubmitEditing={sendCode} autoFocus />
      </Field>
      <SmsConsent />
      <Button title={t('auth.sendCode')} onPress={sendCode} loading={busy} />
      <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
        <Text style={text.muted}>
          {t('auth.noAccount')}{' '}
          <Link href="/(auth)/sign-up" style={{ color: colors.accent, fontWeight: '600' }}>
            {t('welcome.signUp')}
          </Link>
        </Text>
      </View>
    </Screen>
  );
}

/** EXPO_PUBLIC_AUTH_DEV_BYPASS=true: any id + email becomes the bearer `dev:<id>:<email>`. */
function DevLogin() {
  const { t } = useI18n();
  const { devSignIn } = useAuth();
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!id.trim()) return setError(t('auth.devUserId'));
    if (!email.trim()) return setError(t('auth.emailRequired'));
    setBusy(true);
    try {
      await devSignIn(id, email);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen title={t('auth.devTitle')} subtitle={t('auth.devSubtitle')}>
      {error ? <InlineMessage message={error} /> : null}
      <Field label={t('auth.devUserId')}>
        <Input value={id} onChangeText={setId} autoCapitalize="none" placeholder="worker1" />
      </Field>
      <Field label={t('common.email')}>
        <Input
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="worker1@example.com"
          onSubmitEditing={submit}
        />
      </Field>
      <Button title={t('auth.devSignIn')} onPress={submit} loading={busy} />
    </Screen>
  );
}
