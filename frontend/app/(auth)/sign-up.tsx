import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import type { Role } from '@/api/types';
import { authErrorKey, useAuth } from '@/auth/AuthContext';
import { pendingSignup } from '@/auth/pending';
import { Brand, SmsConsent } from '@/components/Brand';
import { PhoneInput } from '@/components/PhoneInput';
import { Button, Field, InlineMessage, Screen } from '@/components/ui';
import { ChoiceCard } from '@/components/Wizard';
import { useI18n, type StringKey } from '@/i18n';
import { isValidUSPhone, toE164 } from '@/lib/phone';
import { colors, spacing, text } from '@/theme';

/**
 * Passwordless sign-up. Step 1: role. Step 2: phone number. The user is auto-confirmed and a
 * log-in code is sent via Twilio Verify; the verify screen finishes the sign-in.
 */
export default function SignUp() {
  const { t } = useI18n();
  const { signUp } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [step, setStep] = useState<'role' | 'phone'>('role');
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!role) return;
    if (!isValidUSPhone(digits)) return setError(t('auth.invalidPhone'));
    const phone = toE164(digits);
    setBusy(true);
    try {
      await pendingSignup.set({ role, phone });
      // The user is auto-confirmed and a log-in code is already on its way; answer that challenge.
      await signUp(phone);
      router.push({ pathname: '/(auth)/verify', params: { phone } });
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
        <Button title={t('common.continue')} disabled={!role} onPress={() => setStep('phone')} style={{ marginTop: spacing.lg }} />
        <Footer />
      </Screen>
    );
  }

  return (
    <Screen title={t('auth.contactTitle')} subtitle={t('auth.contactSubtitle')}>
      <Brand />
      {error ? <InlineMessage message={error} /> : null}
      <Field label={t('common.phone')} hint={t('role.phoneHint')}>
        <PhoneInput value={digits} onChange={setDigits} onSubmitEditing={submit} autoFocus />
      </Field>
      <SmsConsent />
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
