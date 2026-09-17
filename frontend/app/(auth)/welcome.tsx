import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, spacing, text } from '@/theme';

const HOUSE = 76; // rendered width of one letter house
const GAP = 12;

const LETTER = {
  K: require('../../assets/brand/kaam-house-K.png'),
  A: require('../../assets/brand/kaam-house-A.png'),
  M: require('../../assets/brand/kaam-house-M.png'),
} as const;
const WORD = ['K', 'A', 'A', 'M'] as const;

/** Four houses spelling K A A M. */
function HouseRow() {
  return (
    <View style={s.street} accessibilityRole="image" accessibilityLabel="Kaam">
      {WORD.map((ch, i) => (
        <Image key={i} source={LETTER[ch]} style={s.house} resizeMode="contain" />
      ))}
    </View>
  );
}

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
          <HouseRow />
          <Text style={s.tagline}>{t('app.tagline')}</Text>
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
  hero: { flex: 1, alignItems: 'stretch', justifyContent: 'center' },
  street: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: GAP },
  house: { width: HOUSE, height: HOUSE },
  tagline: {
    marginTop: spacing.lg,
    textAlign: 'center',
    color: '#6B4A3A',
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
});
