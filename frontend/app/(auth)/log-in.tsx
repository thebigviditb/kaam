import { Link, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button, Field, InlineMessage, Input, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, spacing, text } from '@/theme';

export default function LogIn() {
  const { devBypass } = useAuth();
  return devBypass ? <DevLogin /> : <CognitoLogin />;
}

function CognitoLogin() {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim()) return setError(t('auth.emailRequired'));
    if (!password) return setError(t('auth.passwordRequired'));
    setBusy(true);
    try {
      await signIn(email, password);
      // The Gate in the root layout redirects once /me is loaded.
    } catch (e) {
      const m = errorMessage(e);
      setError(
        m === 'auth.notConfigured'
          ? t('auth.notConfigured')
          : /NotAuthorized|Incorrect username or password/i.test(m)
            ? t('auth.invalid')
            : m,
      );
      setBusy(false);
    }
  };

  return (
    <Screen title={t('auth.logInTitle')}>
      {error ? <InlineMessage message={error} /> : null}
      <Field label={t('common.email')}>
        <Input
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
      </Field>
      <Field label={t('common.password')}>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          onSubmitEditing={submit}
        />
      </Field>
      <Button title={t('welcome.logIn')} onPress={submit} loading={busy} />
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
