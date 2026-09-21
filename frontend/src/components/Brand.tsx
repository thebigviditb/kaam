import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { LanguageToggle } from './LanguageToggle';
import { useI18n } from '@/i18n';
import { colors, spacing, text } from '@/theme';

const LETTER = {
  K: require('../../assets/brand/kaam-house-K.png'),
  A: require('../../assets/brand/kaam-house-A.png'),
  M: require('../../assets/brand/kaam-house-M.png'),
} as const;
const WORD = ['K', 'A', 'A', 'M'] as const;

/** The Kaam logo: four houses spelling K A A M. */
export function KaamHouses({ size = 30, gap = 5 }: { size?: number; gap?: number }) {
  return (
    <View style={[s.houses, { gap }]} accessibilityRole="image" accessibilityLabel="Kaam">
      {WORD.map((ch, i) => (
        <Image key={i} source={LETTER[ch]} style={{ width: size, height: size }} resizeMode="contain" />
      ))}
    </View>
  );
}

/** Logo row with the language switch on the right, so every sign-up / login / role
 * screen can be flipped to Hindi. */
export function Brand() {
  return (
    <View style={s.wrap}>
      <KaamHouses />
      <View style={{ flex: 1 }} />
      <LanguageToggle />
    </View>
  );
}

/** Carrier-required SMS consent shown under phone inputs. */
export function SmsConsent() {
  const { t } = useI18n();
  return <Text style={[text.small, s.consent]}>{t('auth.smsConsent')}</Text>;
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  houses: { flexDirection: 'row', alignItems: 'flex-end' },
  consent: { marginTop: -spacing.sm, marginBottom: spacing.md, lineHeight: 17 },
});
