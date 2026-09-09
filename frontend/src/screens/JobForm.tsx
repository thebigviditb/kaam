import React, { useState } from 'react';

import { useMeta } from '@/api/hooks';
import type { JobIn, PayType } from '@/api/types';
import { ChipRadio } from '@/components/Chip';
import { Select } from '@/components/Select';
import { TagPicker } from '@/components/TagPicker';
import { Button, Field, InlineMessage, Input, Loading } from '@/components/ui';
import { useI18n } from '@/i18n';

export function JobForm({
  initial,
  onSubmit,
  submitting,
  submitLabel,
  error,
  onCancel,
}: {
  initial?: Partial<JobIn>;
  onSubmit: (job: JobIn) => void;
  submitting: boolean;
  submitLabel: string;
  error?: string | null;
  onCancel?: () => void;
}) {
  const { t, label } = useI18n();
  const meta = useMeta();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [otherText, setOtherText] = useState(initial?.other_tag_text ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [payAmount, setPayAmount] = useState(initial?.pay_amount != null ? String(initial.pay_amount) : '');
  const [payType, setPayType] = useState<PayType | null>(initial?.pay_type ?? 'hourly');
  const [city, setCity] = useState<string | null>(initial?.city ?? null);
  const [schedule, setSchedule] = useState(initial?.schedule ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!meta.data) return <Loading />;

  const submit = () => {
    const e: Record<string, string> = {};
    const amount = Number(payAmount);
    if (!title.trim()) e.title = t('post.titleRequired');
    if (tags.length === 0) e.tags = t('post.tagsRequired');
    if (tags.includes('other') && !otherText.trim()) e.other = t('post.otherRequired');
    if (!payAmount || !Number.isFinite(amount) || amount <= 0) e.pay = t('post.payRequired');
    if (!payType) e.payType = t('post.payRequired');
    if (!city) e.city = t('profile.cityRequired');
    setErrors(e);
    if (Object.keys(e).length) return;
    onSubmit({
      title: title.trim(),
      tags,
      other_tag_text: tags.includes('other') ? otherText.trim() : null,
      description: description.trim(),
      pay_amount: amount,
      pay_type: payType as PayType,
      city: city as string,
      schedule: schedule.trim(),
    });
  };

  return (
    <>
      {error ? <InlineMessage message={error} /> : null}
      <Field label={t('post.jobTitle')} error={errors.title}>
        <Input value={title} onChangeText={setTitle} placeholder={t('post.jobTitlePlaceholder')} error={Boolean(errors.title)} />
      </Field>
      <TagPicker
        tags={meta.data.tags}
        value={tags}
        onChange={setTags}
        otherText={otherText}
        onOtherTextChange={setOtherText}
        error={errors.tags}
        otherError={errors.other}
      />
      <Field label={t('post.description')} optional>
        <Input value={description} onChangeText={setDescription} multiline placeholder={t('post.descriptionPlaceholder')} />
      </Field>
      <Field label={t('post.payAmount')} error={errors.pay}>
        <Input value={payAmount} onChangeText={setPayAmount} keyboardType="decimal-pad" placeholder="25" error={Boolean(errors.pay)} />
      </Field>
      <Field label={t('post.payType')} error={errors.payType}>
        <ChipRadio options={meta.data.pay_types} value={payType} onChange={setPayType} labelFor={(p) => label('payTypes', p)} />
      </Field>
      <Field label={t('common.city')} error={errors.city}>
        <Select value={city} options={meta.data.cities} onChange={setCity} placeholder={t('common.city')} error={Boolean(errors.city)} />
      </Field>
      <Field label={t('post.schedule')} optional>
        <Input value={schedule} onChangeText={setSchedule} placeholder={t('post.schedulePlaceholder')} />
      </Field>
      <Button title={submitLabel} onPress={submit} loading={submitting} />
      {onCancel ? <Button title={t('common.cancel')} variant="ghost" onPress={onCancel} style={{ marginTop: 8 }} /> : null}
    </>
  );
}
