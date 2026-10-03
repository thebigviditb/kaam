import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { LanguageToggle } from './LanguageToggle';
import { useI18n } from '@/i18n';
import { colors, spacing, text } from '@/theme';

const LETTER = {
  W: require('../../assets/brand/works-house-W.png'),
  O: require('../../assets/brand/works-house-O.png'),
  R: require('../../assets/brand/works-house-R.png'),
  K: require('../../assets/brand/works-house-K.png'),
  S: require('../../assets/brand/works-house-S.png'),
} as const;
const WORD = ['W', 'O', 'R', 'K', 'S'] as const;

/** The Works logo: five houses spelling W O R K S. */
export function WorksHouses({ size = 24, gap = 4 }: { size?: number; gap?: number }) {
  return (
    <View style={[s.houses, { gap }]} accessibilityRole="image" accessibilityLabel="Works">
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
      <WorksHouses />
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
