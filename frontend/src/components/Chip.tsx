import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme';

export function Chip({
  label,
  selected,
  onPress,
  small,
  big,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  small?: boolean;
  /** Large tap target for onboarding questions. */
  big?: boolean;
}) {
  const body = (
    <View style={[s.chip, small && s.chipSmall, big && s.chipBig, selected && s.chipSelected]}>
      <Text style={[s.text, small && { fontSize: 12 }, big && { fontSize: 17 }, selected && s.textSelected]}>
        {label}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      {body}
    </Pressable>
  );
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  labelFor,
  big,
}: {
  options: T[];
  value: T[];
  onChange: (next: T[]) => void;
  labelFor: (v: T) => string;
  big?: boolean;
}) {
  const toggle = (v: T) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <View style={s.group}>
      {options.map((o) => (
        <Chip key={o} label={labelFor(o)} selected={value.includes(o)} onPress={() => toggle(o)} big={big} />
      ))}
    </View>
  );
}

export function ChipRadio<T extends string>({
  options,
  value,
  onChange,
  labelFor,
}: {
  options: T[];
  value: T | null;
  onChange: (next: T | null) => void;
  labelFor: (v: T) => string;
}) {
  return (
    <View style={s.group}>
      {options.map((o) => (
        <Chip
          key={o}
          label={labelFor(o)}
          selected={value === o}
          onPress={() => onChange(value === o ? null : o)}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipSmall: { paddingHorizontal: 10, paddingVertical: 4 },
  chipBig: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, minWidth: 96, alignItems: 'center' },
  chipSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  text: { fontSize: 14, color: colors.text },
  textSelected: { color: colors.accent, fontWeight: '600' },
});
