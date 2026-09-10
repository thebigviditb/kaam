import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import type { Role } from '@/api/types';
import { authErrorKey, useAuth, type Contact } from '@/auth/AuthContext';
import { pendingSignup } from '@/auth/pending';
import { Brand, SmsConsent } from '@/components/Brand';
import { PhoneInput } from '@/components/PhoneInput';
import { Button, Field, InlineMessage, Input, Screen } from '@/components/ui';
import { ChoiceCard } from '@/components/Wizard';
import { useI18n, type StringKey } from '@/i18n';
import { isValidUSPhone, looksLikeEmail, toE164 } from '@/lib/phone';
import { colors, spacing, text } from '@/theme';

/**
 * Passwordless sign-up. Step 1: role. Step 2: phone (workers) or phone/email (households).
 * Cognito sends a confirmation code; the verify screen finishes it.
 */
export default function SignUp() {
  const { t } = useI18n();
  const { signUp } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [step, setStep] = useState<'role' | 'contact'>('role');
  const [channel, setChannel] = useState<'phone' | 'email'>('phone');
  const [digits, setDigits] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!role) return;
    let contact: Contact;
    if (channel === 'phone') {
      if (!isValidUSPhone(digits)) return setError(t('auth.invalidPhone'));
      contact = { kind: 'phone', value: toE164(digits) };
    } else {
      if (!looksLikeEmail(email)) return setError(t('auth.invalidEmail'));
      contact = { kind: 'email', value: email.trim().toLowerCase() };
    }
    setBusy(true);
    try {
      await pendingSignup.set({ role, phone: channel === 'phone' ? contact.value : undefined });
      const result = await signUp(contact);
      if (result.step === 'confirm') {
        router.push({ pathname: '/(auth)/verify', params: { username: contact.value, kind: contact.kind } });
      }
      // 'signedIn' → the Gate in the root layout takes over.
    } catch (e) {
      const key = authErrorKey(e);
      setError(key ? t(key as StringKey) : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'role') {
    return (
      <Screen title={t('auth.signUpTitle')} subtitle={t('auth.roleQuestion')}>
        <Brand />
        <View style={{ gap: spacing.sm }}>
          <ChoiceCard title={t('role.worker')} desc={t('role.workerDesc')} selected={role === 'worker'} onPress={() => setRole('worker')} />
          <ChoiceCard title={t('role.customer')} desc={t('role.customerDesc')} selected={role === 'customer'} onPress={() => setRole('customer')} />
        </View>
        <Button
          title={t('common.continue')}
          disabled={!role}
          onPress={() => {
            setChannel('phone');
            setStep('contact');
          }}
          style={{ marginTop: spacing.lg }}
        />
        <Footer />
      </Screen>
    );
  }

  return (
    <Screen title={t('auth.contactTitle')} subtitle={t('auth.contactSubtitle')}>
      <Brand />
      {error ? <InlineMessage message={error} /> : null}
      {role === 'customer' ? (
        <View style={s.switch}>
          <Button title={t('auth.usePhone')} variant={channel === 'phone' ? 'primary' : 'secondary'} small onPress={() => setChannel('phone')} />
          <Button title={t('auth.useEmail')} variant={channel === 'email' ? 'primary' : 'secondary'} small onPress={() => setChannel('email')} />
        </View>
      ) : null}
      {channel === 'phone' ? (
        <>
          <Field label={t('common.phone')} hint={t('role.phoneHint')}>
            <PhoneInput value={digits} onChange={setDigits} onSubmitEditing={submit} autoFocus />
          </Field>
          <SmsConsent />
        </>
      ) : (
        <Field label={t('common.email')}>
          <Input
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            onSubmitEditing={submit}
            autoFocus
          />
        </Field>
      )}
      <Button title={t('auth.sendCode')} onPress={submit} loading={busy} />
      <Button title={t('common.back')} variant="ghost" onPress={() => setStep('role')} style={{ marginTop: spacing.sm }} />
      <Footer />
    </Screen>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
      <Text style={text.muted}>
        {t('auth.haveAccount')}{' '}
        <Link href="/(auth)/log-in" style={{ color: colors.accent, fontWeight: '600' }}>
          {t('welcome.logIn')}
        </Link>
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  switch: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
});
