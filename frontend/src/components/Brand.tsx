import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { LanguageToggle } from './LanguageToggle';
import { useI18n } from '@/i18n';
import { colors, spacing, text } from '@/theme';

/** The "Kaam" brand mark (always Latin script) with the language switch on the right,
 * so every sign-up / login / role screen can be flipped to Hindi. */
export function Brand() {
  return (
    <View style={s.wrap}>
      <Image
        source={require('../../assets/brand/kaam-mark.png')}
        style={s.logo}
        resizeMode="contain"
        accessibilityLabel="Kaam"
      />
      <Text style={s.name}>Kaam</Text>
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
  logo: { width: 34, height: 34 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  consent: { marginTop: -spacing.sm, marginBottom: spacing.md, lineHeight: 17 },
});
