import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useI18n } from '@/i18n';
import { colors, spacing } from '@/theme';

/** Simple back link for detail screens (tabs hide the native header). */
export function Back({ fallback }: { fallback: Href }) {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
      style={s.back}>
      <Ionicons name="chevron-back" size={20} color={colors.accent} />
      <Text style={s.text}>{t('common.back')}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, alignSelf: 'flex-start' },
  text: { color: colors.accent, fontSize: 16, fontWeight: '600' },
});
