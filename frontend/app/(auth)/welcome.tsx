import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, spacing, text } from '@/theme';

export default function Welcome() {
  const { t } = useI18n();
  const { devBypass } = useAuth();
  const router = useRouter();
  return (
    <Screen>
      <View style={s.wrap}>
        <View style={s.top}>
          <LanguageToggle />
        </View>
        <View style={s.hero}>
          <Image
            source={require('../../assets/brand/kaam-logo.png')}
            style={s.logo}
            resizeMode="contain"
            accessibilityLabel={t('app.name')}
          />
          <Text style={[text.muted, { textAlign: 'center', fontSize: 16, marginTop: spacing.md }]}>
            {t('app.tagline')}
          </Text>
          <View style={s.pills}>
            <Text style={s.pill}>{t('welcome.worker')}</Text>
            <Text style={s.pill}>{t('welcome.customer')}</Text>
          </View>
        </View>
        <View style={s.actions}>
          {devBypass ? (
            <Button title={t('auth.devSignIn')} onPress={() => router.push('/(auth)/log-in')} />
          ) : (
            <>
              <Button title={t('welcome.signUp')} onPress={() => router.push('/(auth)/sign-up')} />
              <Button
                title={t('welcome.logIn')}
                variant="secondary"
                onPress={() => router.push('/(auth)/log-in')}
              />
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, minHeight: 520 },
  top: { alignItems: 'flex-end' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 300, maxWidth: '100%', aspectRatio: 794 / 260 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.lg },
  pill: {
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
  },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
});
