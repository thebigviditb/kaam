import React, { useState } from 'react';
import { View } from 'react-native';

import type { JobFilters as Filters, Meta, PayType } from '@/api/types';
import { ChipGroup, ChipRadio } from '@/components/Chip';
import { Select } from '@/components/Select';
import { Button, Field, Input } from '@/components/ui';
import { useI18n } from '@/i18n';
import { spacing } from '@/theme';

export function JobFilterPanel({
  meta,
  value,
  onChange,
}: {
  meta: Meta;
  value: Filters;
  onChange: (f: Filters) => void;
}) {
  const { t, label } = useI18n();
  const [open, setOpen] = useState(false);
  const active =
    (value.tags?.length ?? 0) + (value.city ? 1 : 0) + (value.min_pay ? 1 : 0) + (value.pay_type ? 1 : 0);
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Button
        title={`${open ? t('common.hideFilters') : t('common.showFilters')}${active ? ` (${active})` : ''}`}
        variant="secondary"
        small
        onPress={() => setOpen((o) => !o)}
        style={{ alignSelf: 'flex-start' }}
      />
      {open ? (
        <View style={{ marginTop: spacing.md }}>
          <Field label={t('common.tags')}>
            <ChipGroup
              options={meta.tags}
              value={value.tags ?? []}
              onChange={(tags) => onChange({ ...value, tags: tags.length ? tags : undefined })}
              labelFor={(x) => label('tags', x)}
            />
          </Field>
          <Field label={t('common.city')}>
            <Select
              value={value.city ?? null}
              options={meta.cities}
              onChange={(city) => onChange({ ...value, city: city ?? undefined })}
              placeholder={t('common.any')}
              allowClear
            />
          </Field>
          <Field label={t('jobs.minPay')}>
            <Input
              value={value.min_pay != null ? String(value.min_pay) : ''}
              onChangeText={(v) => {
                const n = Number(v);
                onChange({ ...value, min_pay: v && Number.isFinite(n) && n > 0 ? n : undefined });
              }}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </Field>
          <Field label={t('jobs.payType')}>
            <ChipRadio
              options={meta.pay_types}
              value={(value.pay_type as PayType) ?? null}
              onChange={(p) => onChange({ ...value, pay_type: p ?? undefined })}
              labelFor={(p) => label('payTypes', p)}
            />
          </Field>
          {active ? (
            <Button title={t('common.clear')} variant="ghost" small onPress={() => onChange({})} style={{ alignSelf: 'flex-start' }} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
