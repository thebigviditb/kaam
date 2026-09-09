import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';
import { colors, maxContentWidth, radius, spacing, text } from '@/theme';

export function Select<T extends string>({
  value,
  options,
  onChange,
  labelFor,
  placeholder,
  allowClear,
  error,
}: {
  value: T | null;
  options: T[];
  onChange: (v: T | null) => void;
  labelFor?: (v: T) => string;
  placeholder?: string;
  allowClear?: boolean;
  error?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const label = (v: T) => (labelFor ? labelFor(v) : v);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={[s.trigger, error && { borderColor: colors.danger }]}>
        <Text style={[s.triggerText, !value && { color: colors.muted }]} numberOfLines={1}>
          {value ? label(value) : (placeholder ?? t('common.select'))}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[s.sheet, { paddingBottom: insets.bottom + spacing.sm }]} onPress={() => {}}>
            <View style={s.sheetHeader}>
              <Text style={text.h3}>{placeholder ?? t('common.select')}</Text>
              {allowClear && value ? (
                <Pressable
                  onPress={() => {
                    onChange(null);
                    setOpen(false);
                  }}>
                  <Text style={{ color: colors.accent, fontWeight: '600' }}>{t('common.clear')}</Text>
                </Pressable>
              ) : null}
            </View>
            <FlatList
              data={options}
              keyExtractor={(x) => x}
              style={{ maxHeight: 420 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [s.option, pressed && { backgroundColor: colors.bgAlt }]}>
                  <Text style={[text.body, item === value && { color: colors.accent, fontWeight: '600' }]}>
                    {label(item)}
                  </Text>
                  {item === value ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.bg,
    minHeight: 46,
  },
  triggerText: { flex: 1, fontSize: 16, color: colors.text },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: maxContentWidth,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
});
