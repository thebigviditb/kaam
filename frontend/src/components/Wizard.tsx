import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, InlineMessage } from './ui';
import { useI18n } from '@/i18n';
import { colors, maxContentWidth, radius, spacing, text } from '@/theme';

/** One question per screen: progress bar, back button, big title, content, sticky Next. */
export function WizardStep({
  step,
  total,
  title,
  hint,
  error,
  onBack,
  onNext,
  nextLabel,
  nextLoading,
  secondary,
  children,
}: {
  step: number;
  total: number;
  title: string;
  hint?: string;
  error?: string | null;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextLoading?: boolean;
  secondary?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <View style={s.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
        <View style={s.content}>
          <View style={s.topRow}>
            {onBack ? (
              <Pressable onPress={onBack} accessibilityRole="button" style={s.back} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={colors.accent} />
                <Text style={s.backText}>{t('common.back')}</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Text style={text.small}>{t('onb.progress', { n: step, total })}</Text>
          </View>
          <View style={s.track}>
            <View style={[s.fill, { width: `${Math.round((step / total) * 100)}%` }]} />
          </View>
          <Text style={s.title}>{title}</Text>
          {hint ? <Text style={[text.muted, { marginBottom: spacing.md }]}>{hint}</Text> : null}
          {error ? <InlineMessage message={error} /> : null}
          {children}
        </View>
      </ScrollView>
      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={s.footerInner}>
          {secondary ? (
            <Button title={secondary.label} variant="ghost" onPress={secondary.onPress} />
          ) : null}
          <Button
            title={nextLabel ?? t('common.next')}
            onPress={onNext}
            loading={nextLoading}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

/** Big tappable card for single-choice questions. */
export function ChoiceCard({
  title,
  desc,
  selected,
  onPress,
}: {
  title: string;
  desc?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[s.choice, selected && s.choiceSelected]}>
      <View style={{ flex: 1 }}>
        <Text style={[text.h3, { fontSize: 17 }, selected && { color: colors.accent }]}>{title}</Text>
        {desc ? <Text style={[text.muted, { marginTop: 2 }]}>{desc}</Text> : null}
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? colors.accent : colors.border}
      />
    </Pressable>
  );
}

export function ChoiceList<T extends string>({
  options,
  value,
  onChange,
  labelFor,
  descFor,
}: {
  options: T[];
  value: T | null;
  onChange: (v: T) => void;
  labelFor: (v: T) => string;
  descFor?: (v: T) => string | undefined;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      {options.map((o) => (
        <ChoiceCard
          key={o}
          title={labelFor(o)}
          desc={descFor?.(o)}
          selected={value === o}
          onPress={() => onChange(o)}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  content: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 },
  back: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, marginVertical: spacing.md, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.accent },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: spacing.md, lineHeight: 32 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  footerInner: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius,
    padding: spacing.md,
    minHeight: 64,
  },
  choiceSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
});
