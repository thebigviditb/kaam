import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useCreateMe } from '@/api/hooks';
import type { Role } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { pendingSignup } from '@/auth/pending';
import { Brand, SmsConsent } from '@/components/Brand';
import { PhoneInput } from '@/components/PhoneInput';
import { Button, Field, InlineMessage, Screen } from '@/components/ui';
import { ChoiceCard } from '@/components/Wizard';
import { useI18n } from '@/i18n';
import { isValidUSPhone, toE164 } from '@/lib/phone';
import { spacing } from '@/theme';

/**
 * Creates the app-side user (POST /me) after Cognito sign-in. The role is prefilled from the
 * sign-up flow when we have it. The phone is the one the user signed up with (the Cognito
 * session's phone_number, or the pending sign-up on this device) and is not asked for again;
 * only a session without a phone (the dev bypass) shows the phone field.
 */
export default function ChooseRole() {
  const { t, lang } = useI18n();
  const { signOut, phone: sessionPhone } = useAuth();
  const router = useRouter();
  const createMe = useCreateMe();
  const [role, setRole] = useState<Role | null>(null);
  const [roleLocked, setRoleLocked] = useState(false);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pendingSignup.get().then((p) => {
      if (!p) return;
      setRole(p.role);
      setRoleLocked(true);
      if (p.phone) setPendingPhone(p.phone);
    });
  }, []);

  const knownPhone = sessionPhone ?? pendingPhone;

  const submit = async () => {
    setError(null);
    if (!role) return;
    let phone = knownPhone;
    if (!phone) {
      if (!isValidUSPhone(digits)) return setError(t('auth.invalidPhone'));
      phone = toE164(digits);
    }
    try {
      const user = await createMe.mutateAsync({ role, phone, preferred_language: lang });
      await pendingSignup.clear();
      router.replace(user.role === 'worker' ? '/(onboarding)/worker' : '/(onboarding)/customer');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen title={t('role.title')} subtitle={t('role.subtitle')}>
      <Brand />
      {error ? <InlineMessage message={error} /> : null}
      <View style={{ gap: spacing.sm }}>
        <ChoiceCard
          title={t('role.worker')}
          desc={t('role.workerDesc')}
          selected={role === 'worker'}
          onPress={() => !roleLocked && setRole('worker')}
        />
        <ChoiceCard
          title={t('role.customer')}
          desc={t('role.customerDesc')}
          selected={role === 'customer'}
          onPress={() => !roleLocked && setRole('customer')}
        />
      </View>
      {knownPhone ? null : (
        <View style={{ marginTop: spacing.lg }}>
          <Field label={t('common.phone')} hint={t('role.phoneHint')}>
            <PhoneInput value={digits} onChange={setDigits} onSubmitEditing={submit} />
          </Field>
          <SmsConsent />
        </View>
      )}
      <Button
        title={t('common.continue')}
        onPress={submit}
        disabled={!role}
        loading={createMe.isPending}
        style={{ marginTop: knownPhone ? spacing.lg : spacing.sm }}
      />
      <Button title={t('settings.logOut')} variant="ghost" onPress={signOut} style={{ marginTop: spacing.sm }} />
    </Screen>
  );
}
