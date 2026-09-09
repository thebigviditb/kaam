import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button, Field, InlineMessage, Input, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, spacing, text } from '@/theme';

export default function SignUp() {
  const { t } = useI18n();
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim()) return setError(t('auth.emailRequired'));
    if (password.length < 8) return setError(t('auth.passwordHint'));
    setBusy(true);
    try {
      await signUp(email, password);
      router.push({ pathname: '/(auth)/verify', params: { email: email.trim() } });
    } catch (e) {
      const m = errorMessage(e);
      setError(m === 'auth.notConfigured' ? t('auth.notConfigured') : m);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={t('auth.signUpTitle')} subtitle={t('auth.signUpSubtitle')}>
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
      <Field label={t('common.password')} hint={t('auth.passwordHint')}>
        <Input value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" />
      </Field>
      <Button title={t('welcome.signUp')} onPress={submit} loading={busy} />
      <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
        <Text style={text.muted}>
          {t('auth.haveAccount')}{' '}
          <Link href="/(auth)/log-in" style={{ color: colors.accent, fontWeight: '600' }}>
            {t('welcome.logIn')}
          </Link>
        </Text>
      </View>
    </Screen>
  );
}
