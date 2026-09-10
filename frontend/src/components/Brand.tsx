import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n';
import { colors, spacing, text } from '@/theme';

/** The "Kaam" brand mark, always in Latin script so the name is recognizable in either language. */
export function Brand() {
  return (
    <View style={s.wrap}>
      <View style={s.logo}>
        <Text style={s.logoText}>K</Text>
      </View>
      <Text style={s.name}>Kaam</Text>
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
  logo: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  consent: { marginTop: -spacing.sm, marginBottom: spacing.md, lineHeight: 17 },
});
