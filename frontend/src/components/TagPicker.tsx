import React from 'react';

import { ChipGroup } from './Chip';
import { Field, Input } from './ui';
import { useI18n } from '@/i18n';

/** Multi-select tag chips; selecting "other" reveals a free-text box. */
export function TagPicker({
  tags,
  value,
  onChange,
  otherText,
  onOtherTextChange,
  error,
  otherError,
  label,
  big,
}: {
  tags: string[];
  value: string[];
  onChange: (v: string[]) => void;
  otherText: string;
  onOtherTextChange: (v: string) => void;
  error?: string | null;
  otherError?: string | null;
  label?: string;
  big?: boolean;
}) {
  const { t, label: l } = useI18n();
  return (
    <>
      <Field label={label ?? t('common.tags')} error={error}>
        <ChipGroup options={tags} value={value} onChange={onChange} labelFor={(x) => l('tags', x)} big={big} />
      </Field>
      {value.includes('other') ? (
        <Field label={t('common.otherDescribe')} error={otherError}>
          <Input value={otherText} onChangeText={onOtherTextChange} error={Boolean(otherError)} />
        </Field>
      ) : null}
    </>
  );
}
