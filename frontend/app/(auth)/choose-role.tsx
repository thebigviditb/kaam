import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useCreateMe } from '@/api/hooks';
import type { Role } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Button, Field, InlineMessage, Input, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, radius, spacing, text } from '@/theme';

export default function ChooseRole() {
  const { t, lang } = useI18n();
  const { signOut } = useAuth();
  const router = useRouter();
  const createMe = useCreateMe();
  const [role, setRole] = useState<Role | null>(null);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!role) return;
    if (role === 'worker' && !phone.trim()) return setError(t('role.phoneRequired'));
    try {
      const user = await createMe.mutateAsync({
        role,
        phone: phone.trim() || null,
        preferred_language: lang,
      });
      router.replace(user.role === 'worker' ? '/(worker)/profile' : '/(customer)/profile');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen title={t('role.title')} subtitle={t('role.subtitle')}>
      {error ? <InlineMessage message={error} /> : null}
      <RoleCard
        title={t('role.worker')}
        desc={t('role.workerDesc')}
        selected={role === 'worker'}
        onPress={() => setRole('worker')}
      />
      <RoleCard
        title={t('role.customer')}
        desc={t('role.customerDesc')}
        selected={role === 'customer'}
        onPress={() => setRole('customer')}
      />
      {role === 'worker' ? (
        <View style={{ marginTop: spacing.md }}>
          <Field label={t('common.phone')} hint={t('role.phoneHint')}>
            <Input
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              placeholder="+1 408 555 0100"
            />
          </Field>
        </View>
      ) : null}
      <Button
        title={t('role.continue')}
        onPress={submit}
        disabled={!role}
        loading={createMe.isPending}
        style={{ marginTop: spacing.md }}
      />
      <Button title={t('settings.logOut')} variant="ghost" onPress={signOut} style={{ marginTop: spacing.sm }} />
    </Screen>
  );
}

function RoleCard({
  title,
  desc,
  selected,
  onPress,
}: {
  title: string;
  desc: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[s.card, selected && s.cardSelected]}>
      <Text style={[text.h2, selected && { color: colors.accent }]}>{title}</Text>
      <Text style={[text.muted, { marginTop: spacing.xs }]}>{desc}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
});
