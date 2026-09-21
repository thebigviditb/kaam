import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { KaamHouses } from '@/components/Brand';
import { Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, spacing, text } from '@/theme';

export type LegalSection = { heading: string; body: string[] };

/** Shared layout for the public policy pages. */
export function LegalScreen({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <Screen>
      <Pressable onPress={() => router.replace('/(auth)/welcome')} accessibilityRole="link">
        <KaamHouses size={26} gap={4} />
      </Pressable>
      <Text style={[text.h1, s.title]}>{title}</Text>
      <Text style={text.small}>{updated}</Text>
      {sections.map((section) => (
        <View key={section.heading} style={s.section}>
          <Text style={text.h3}>{section.heading}</Text>
          {section.body.map((paragraph, i) => (
            <Text key={i} style={[text.muted, s.paragraph]}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
      <View style={s.footer}>
        <Pressable onPress={() => router.push('/(public)/privacy')} accessibilityRole="link">
          <Text style={s.link}>{t('legal.privacy')}</Text>
        </Pressable>
        <Text style={text.small}>·</Text>
        <Pressable onPress={() => router.push('/(public)/terms')} accessibilityRole="link">
          <Text style={s.link}>{t('legal.terms')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { marginTop: spacing.md },
  section: { marginTop: spacing.lg, gap: spacing.sm },
  paragraph: { lineHeight: 21 },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  link: { color: colors.accent, fontWeight: '600' },
});
