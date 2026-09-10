import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Input } from './ui';
import { formatUSPhone, phoneDigits } from '@/lib/phone';
import { colors, spacing } from '@/theme';

/**
 * US phone input. `value` is the bare 10-digit string; the caller converts it to
 * E.164 with toE164() once it validates.
 */
export function PhoneInput({
  value,
  onChange,
  error,
  onSubmitEditing,
  autoFocus,
}: {
  value: string;
  onChange: (digits: string) => void;
  error?: boolean;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
}) {
  return (
    <View style={s.wrap}>
      <View style={[s.prefix, error && { borderColor: colors.danger }]}>
        <Text style={s.prefixText}>+1</Text>
      </View>
      <Input
        value={formatUSPhone(value)}
        onChangeText={(t) => onChange(phoneDigits(t))}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel-national"
        placeholder="(408) 555-0100"
        error={error}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        style={s.input}
        maxLength={14}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: spacing.sm },
  prefix: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.bgAlt,
  },
  prefixText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  input: { flex: 1 },
});
