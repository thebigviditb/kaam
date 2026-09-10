import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { keys, useMeta, useUpsertCustomerProfile } from '@/api/hooks';
import { DAYS, PAY_TYPES, START_TIMINGS, TIMES, type PayType, type StartTiming, type User } from '@/api/types';
import { ChipGroup, ChipRadio } from '@/components/Chip';
import { Select } from '@/components/Select';
import { TagPicker } from '@/components/TagPicker';
import { Field, Input, Loading } from '@/components/ui';
import { ChoiceList, WizardStep } from '@/components/Wizard';
import { useI18n } from '@/i18n';

const TOTAL = 5;

/** The household's need, one question per screen. Saved with PUT /customers/me at the end. */
export function CustomerOnboarding() {
  const { t, label } = useI18n();
  const meta = useMeta();
  const upsert = useUpsertCustomerProfile();
  const qc = useQueryClient();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [city, setCity] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [timing, setTiming] = useState<StartTiming | null>(null);
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [pay, setPay] = useState('');
  const [payType, setPayType] = useState<PayType>('hourly');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!meta.data) return <Loading />;

  const next = () => {
    setError(null);
    setStep((s) => s + 1);
  };
  const back = step > 1 ? () => setStep((s) => s - 1) : undefined;

  const finish = async () => {
    const amount = pay.trim() ? Number(pay) : null;
    if (amount != null && (!Number.isFinite(amount) || amount < 0)) return setError(t('onb.payInvalid'));
    setError(null);
    try {
      await upsert.mutateAsync({
        display_name: name.trim(),
        city: city as string,
        tags,
        other_tag_text: tags.includes('other') ? otherText.trim() : null,
        description: description.trim(),
        pay_amount: amount,
        pay_type: payType,
        start_timing: timing as StartTiming,
        days,
        times,
        is_active: true,
      });
      qc.setQueryData<User | null>(keys.me, (u) => (u ? { ...u, onboarded: true } : u));
      router.replace('/(customer)/matches');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  switch (step) {
    case 1:
      return (
        <WizardStep
          step={1}
          total={TOTAL}
          title={t('onb.c.nameTitle')}
          error={error}
          onNext={() => {
            if (!name.trim()) return setError(t('onb.nameRequired'));
            if (!city) return setError(t('onb.cityRequired'));
            next();
          }}>
          <Field label={t('onb.c.name')}>
            <Input value={name} onChangeText={setName} placeholder={t('onb.c.namePlaceholder')} autoFocus />
          </Field>
          <Field label={t('onb.c.city')}>
            <Select value={city} options={meta.data.cities} onChange={setCity} placeholder={t('common.city')} />
          </Field>
        </WizardStep>
      );
    case 2:
      return (
        <WizardStep
          step={2}
          total={TOTAL}
          title={t('onb.c.tagsTitle')}
          hint={t('onb.c.tagsHint')}
          error={error}
          onBack={back}
          onNext={() => {
            if (tags.length === 0) return setError(t('onb.tagsRequired'));
            if (tags.includes('other') && !otherText.trim()) return setError(t('onb.otherRequired'));
            next();
          }}>
          <TagPicker
            tags={meta.data.tags}
            value={tags}
            onChange={setTags}
            otherText={otherText}
            onOtherTextChange={setOtherText}
            label={t('common.tags')}
            big
          />
        </WizardStep>
      );
    case 3:
      return (
        <WizardStep
          step={3}
          total={TOTAL}
          title={t('onb.c.timingTitle')}
          error={error}
          onBack={back}
          onNext={() => {
            if (!timing) return setError(t('onb.timingRequired'));
            next();
          }}>
          <ChoiceList
            options={START_TIMINGS}
            value={timing}
            onChange={setTiming}
            labelFor={(v) => label('startTimings', v)}
          />
        </WizardStep>
      );
    case 4:
      return (
        <WizardStep
          step={4}
          total={TOTAL}
          title={t('onb.c.daysTitle')}
          error={error}
          onBack={back}
          onNext={() => {
            if (days.length === 0) return setError(t('onb.daysRequired'));
            if (times.length === 0) return setError(t('onb.timesRequired'));
            next();
          }}>
          <Field label={t('common.days')}>
            <ChipGroup options={DAYS} value={days} onChange={setDays} labelFor={(v) => label('days', v)} big />
          </Field>
          <Field label={t('onb.c.timesTitle')}>
            <ChipGroup options={TIMES} value={times} onChange={setTimes} labelFor={(v) => label('times', v)} big />
          </Field>
        </WizardStep>
      );
    default:
      return (
        <WizardStep
          step={5}
          total={TOTAL}
          title={t('onb.c.payTitle')}
          error={error}
          onBack={back}
          onNext={finish}
          nextLabel={t('onb.c.finish')}
          nextLoading={upsert.isPending}>
          <Field label={t('onb.c.payAmount')} optional>
            <Input value={pay} onChangeText={setPay} keyboardType="decimal-pad" placeholder="25" />
          </Field>
          <Field label={t('onb.c.payType')}>
            <ChipRadio
              options={PAY_TYPES}
              value={payType}
              onChange={(v) => setPayType(v ?? 'hourly')}
              labelFor={(v) => label('payTypes', v)}
            />
          </Field>
          <View style={{ height: 8 }} />
          <Field label={t('onb.c.description')} optional>
            <Input value={description} onChangeText={setDescription} multiline placeholder={t('onb.c.descPlaceholder')} />
          </Field>
        </WizardStep>
      );
  }
}
