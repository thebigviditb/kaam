import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HinglishDisplay } from '@/api/types';
import { useI18n } from '@/i18n';
import { colors, spacing } from '@/theme';

const OPTIONS: HinglishDisplay[] = ['original', 'english'];

/**
 * Two-option segmented control for how an English-language reader sees
 * Hinglish messages. `value` null selects neither option (never chosen yet).
 */
export function HinglishDisplayToggle({
  value,
  onChange,
  disabled = false,
  compact = false,
}: {
  value: HinglishDisplay | null;
  onChange: (v: HinglishDisplay) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <View style={[s.wrap, disabled && { opacity: 0.6 }]}>
      {OPTIONS.map((o) => {
        const active = o === value;
        return (
          <Pressable
            key={o}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
            aria-selected={active}
            disabled={disabled}
            onPress={() => {
              if (o !== value) onChange(o);
            }}
            style={[s.item, compact && s.itemCompact, active && s.active]}>
            <Text style={[s.text, compact && s.textCompact, active && s.activeText]}>
              {t(o === 'english' ? 'hinglish.showEnglish' : 'hinglish.keepWritten')}
            </Text>
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
    backgroundColor: colors.bg,
  },
  item: { paddingHorizontal: spacing.md, paddingVertical: 6 },
  itemCompact: { paddingHorizontal: 12, paddingVertical: 4 },
  active: { backgroundColor: colors.accent },
  text: { fontSize: 14, color: colors.text },
  textCompact: { fontSize: 12 },
  activeText: { color: colors.accentText, fontWeight: '600' },
});
