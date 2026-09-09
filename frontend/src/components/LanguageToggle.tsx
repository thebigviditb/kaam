import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LANGUAGES, useI18n, type Language } from '@/i18n';
import { colors, spacing } from '@/theme';

export function LanguageToggle({ onChange }: { onChange?: (l: Language) => void }) {
  const { lang, setLang, t } = useI18n();
  return (
    <View style={s.wrap}>
      {LANGUAGES.map((l) => {
        const active = l === lang;
        return (
          <Pressable
            key={l}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              setLang(l);
              onChange?.(l);
            }}
            style={[s.item, active && s.active]}>
            <Text style={[s.text, active && s.activeText]}>{t(l === 'en' ? 'lang.en' : 'lang.hi')}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  item: { paddingHorizontal: spacing.md, paddingVertical: 6 },
  active: { backgroundColor: colors.accent },
  text: { fontSize: 14, color: colors.text },
  activeText: { color: '#fff', fontWeight: '600' },
});
