import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';
import { colors, maxContentWidth, radius, spacing, text } from '@/theme';

// ---- layout ----

export function Screen({
  children,
  title,
  subtitle,
  right,
  scroll = true,
  style,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  const header = title ? (
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        <Text style={text.h1}>{title}</Text>
        {subtitle ? <Text style={[text.muted, { marginTop: spacing.xs }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  ) : null;
  const inner = (
    <View style={[s.content, { paddingBottom: insets.bottom + spacing.xl }, style]}>
      {header}
      {children}
    </View>
  );
  if (!scroll) return <View style={s.screen}>{inner}</View>;
  return (
    <ScrollView style={s.screen} keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
      {inner}
    </ScrollView>
  );
}

export function Card({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [s.card, pressed && { backgroundColor: colors.bgAlt }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.row, style]}>{children}</View>;
}

export function Divider() {
  return <View style={s.divider} />;
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={[text.h2, { marginBottom: spacing.sm }]}>{title}</Text>
      {children}
    </View>
  );
}

// ---- buttons ----

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  small,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;
  const bg =
    variant === 'primary'
      ? colors.accent
      : variant === 'danger'
        ? colors.dangerSoft
        : variant === 'secondary'
          ? colors.accentSoft
          : 'transparent';
  const fg =
    variant === 'primary'
      ? colors.accentText
      : variant === 'danger'
        ? colors.danger
        : colors.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.button,
        small && s.buttonSmall,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { paddingHorizontal: spacing.sm },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[s.buttonText, small && { fontSize: 14 }, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

// ---- inputs ----

export function Field({
  label,
  error,
  hint,
  children,
  optional,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={text.label}>
        {label}
        {optional ? <Text style={{ fontWeight: '400' }}> ({t('common.optional')})</Text> : null}
      </Text>
      {children}
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={text.small}>{hint}</Text> : null}
    </View>
  );
}

export function Input(props: TextInputProps & { error?: boolean }) {
  const { style, error, multiline, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      {...rest}
      multiline={multiline}
      style={[
        s.input,
        multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: spacing.sm },
        error && { borderColor: colors.danger },
        style,
      ]}
    />
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable onPress={() => onChange(!value)} style={s.toggle}>
      <Text style={[text.body, { flex: 1 }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.border }}
        thumbColor="#fff"
      />
    </Pressable>
  );
}

// ---- badges ----

const badgeColors: Record<string, { bg: string; fg: string }> = {
  open: { bg: colors.successSoft, fg: colors.success },
  accepted: { bg: colors.successSoft, fg: colors.success },
  pending: { bg: colors.warningSoft, fg: colors.warning },
  filled: { bg: colors.accentSoft, fg: colors.accent },
  rejected: { bg: colors.dangerSoft, fg: colors.danger },
  closed: { bg: colors.border, fg: colors.muted },
};

export function Badge({ label, tone }: { label: string; tone?: string }) {
  const c = (tone && badgeColors[tone]) || { bg: colors.bgAlt, fg: colors.muted };
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.badgeText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

// ---- states ----

export function Loading() {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={s.center}>
      <Text style={[text.muted, { textAlign: 'center' }]}>{message}</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <View style={s.center}>
      <Text style={[text.body, { color: colors.danger, textAlign: 'center' }]}>{message}</Text>
      {onRetry ? (
        <Button title={t('common.retry')} variant="secondary" onPress={onRetry} small style={{ marginTop: spacing.md }} />
      ) : null}
    </View>
  );
}

export function InlineMessage({ message, tone = 'error' }: { message: string; tone?: 'error' | 'success' }) {
  return (
    <View
      style={[
        s.inline,
        { backgroundColor: tone === 'error' ? colors.dangerSoft : colors.successSoft },
      ]}>
      <Text style={{ color: tone === 'error' ? colors.danger : colors.success, fontSize: 14 }}>
        {message}
      </Text>
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
    paddingTop: spacing.lg,
    flex: 1,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  button: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: spacing.md, minHeight: 36 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.xs },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  center: { paddingVertical: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  inline: { padding: spacing.sm + 4, borderRadius: radius, marginBottom: spacing.md },
});
