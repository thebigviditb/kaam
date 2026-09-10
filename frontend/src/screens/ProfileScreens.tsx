import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import {
  useMeta,
  useMyCustomerProfile,
  useMyWorkerProfile,
  useUpsertCustomerProfile,
  useUpsertWorkerProfile,
} from '@/api/hooks';
import {
  DAYS,
  PAY_TYPES,
  START_TIMINGS,
  TIMES,
  type CustomerProfile,
  type PayType,
  type StartTiming,
  type WorkerProfile,
} from '@/api/types';
import { ChipGroup, ChipRadio } from '@/components/Chip';
import { Select } from '@/components/Select';
import { TagPicker } from '@/components/TagPicker';
import { Button, Field, InlineMessage, Input, Loading, Row, Screen, Section, Toggle } from '@/components/ui';
import { useI18n } from '@/i18n';
import { MediaSection } from '@/screens/MediaSection';
import { spacing } from '@/theme';

function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(id);
  }, [saved]);
  return [saved, setSaved] as const;
}

// ---- worker ----

export function WorkerProfileScreen() {
  const { t } = useI18n();
  const profile = useMyWorkerProfile();
  const meta = useMeta();
  if (profile.isPending || !meta.data || !profile.data) return <Loading />;
  return (
    <Screen title={t('profile.title')} subtitle={t('profile.workerIntro')}>
      <WorkerForm initial={profile.data} allTags={meta.data.tags} cities={meta.data.cities} />
      <Section title={t('profile.media')}>
        <MediaSection />
      </Section>
    </Screen>
  );
}

function WorkerForm({ initial, allTags, cities }: { initial: WorkerProfile; allTags: string[]; cities: string[] }) {
  const { t, label } = useI18n();
  const upsert = useUpsertWorkerProfile();
  const [name, setName] = useState(initial.display_name);
  const [bio, setBio] = useState(initial.bio);
  const [city, setCity] = useState<string | null>(initial.city);
  const [workCities, setWorkCities] = useState<string[]>(initial.work_cities);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [otherText, setOtherText] = useState(initial.other_tag_text ?? '');
  const [days, setDays] = useState<string[]>(initial.days);
  const [times, setTimes] = useState<string[]>(initial.times);
  const [years, setYears] = useState(String(initial.years_experience));
  const [rate, setRate] = useState(initial.hourly_rate != null ? String(initial.hourly_rate) : '');
  const [visible, setVisible] = useState(initial.is_visible);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useSavedFlash();

  const submit = async () => {
    if (!name.trim()) return setError(t('onb.nameRequired'));
    if (!city) return setError(t('onb.cityRequired'));
    if (workCities.length === 0) return setError(t('onb.workCitiesRequired'));
    if (tags.length === 0) return setError(t('onb.tagsRequired'));
    if (tags.includes('other') && !otherText.trim()) return setError(t('onb.otherRequired'));
    if (days.length === 0) return setError(t('onb.daysRequired'));
    if (times.length === 0) return setError(t('onb.timesRequired'));
    const yrs = years.trim() ? Number(years) : 0;
    if (!Number.isInteger(yrs) || yrs < 0 || yrs > 60) return setError(t('onb.yearsInvalid'));
    const rt = rate.trim() ? Number(rate) : null;
    if (rt != null && (!Number.isFinite(rt) || rt < 0)) return setError(t('onb.rateInvalid'));
    setError(null);
    try {
      await upsert.mutateAsync({
        display_name: name.trim(),
        bio: bio.trim(),
        city,
        work_cities: workCities,
        tags,
        other_tag_text: tags.includes('other') ? otherText.trim() : null,
        years_experience: yrs,
        hourly_rate: rt,
        days,
        times,
        is_visible: visible,
      });
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <>
      {error ? <InlineMessage message={error} /> : null}
      {saved ? <InlineMessage message={t('profile.saved')} tone="success" /> : null}
      <Field label={t('onb.w.name')}>
        <Input value={name} onChangeText={setName} />
      </Field>
      <Field label={t('onb.w.bio')} optional>
        <Input value={bio} onChangeText={setBio} multiline placeholder={t('onb.w.bioPlaceholder')} />
      </Field>
      <Field label={t('onb.w.city')}>
        <Select
          value={city}
          options={cities}
          onChange={(c) => {
            setCity(c);
            if (c && !workCities.includes(c)) setWorkCities((w) => [...w, c]);
          }}
          placeholder={t('common.city')}
        />
      </Field>
      <Field label={t('onb.w.workCities')} hint={t('onb.w.workCitiesHint')}>
        <ChipGroup options={cities} value={workCities} onChange={setWorkCities} labelFor={(v) => v} />
      </Field>
      <TagPicker tags={allTags} value={tags} onChange={setTags} otherText={otherText} onOtherTextChange={setOtherText} />
      <Field label={t('common.days')}>
        <ChipGroup options={DAYS} value={days} onChange={setDays} labelFor={(v) => label('days', v)} />
      </Field>
      <Field label={t('common.times')}>
        <ChipGroup options={TIMES} value={times} onChange={setTimes} labelFor={(v) => label('times', v)} />
      </Field>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 140 }}>
          <Field label={t('onb.w.years')}>
            <Input value={years} onChangeText={setYears} keyboardType="number-pad" />
          </Field>
        </View>
        <View style={{ flex: 1, minWidth: 140 }}>
          <Field label={t('onb.w.rate')} optional>
            <Input value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="25" />
          </Field>
        </View>
      </Row>
      <Toggle label={t('profile.visible')} value={visible} onChange={setVisible} />
      <Button title={t('common.save')} onPress={submit} loading={upsert.isPending} style={{ marginTop: spacing.md }} />
    </>
  );
}

// ---- customer ----

export function CustomerProfileScreen() {
  const { t } = useI18n();
  const profile = useMyCustomerProfile();
  const meta = useMeta();
  if (profile.isPending || !meta.data || !profile.data) return <Loading />;
  return (
    <Screen title={t('profile.title')} subtitle={t('profile.customerIntro')}>
      <CustomerForm initial={profile.data} allTags={meta.data.tags} cities={meta.data.cities} />
      <Section title={t('profile.workMedia')}>
        <MediaSection hint={t('profile.workMediaHint')} />
      </Section>
    </Screen>
  );
}

function CustomerForm({
  initial,
  allTags,
  cities,
}: {
  initial: CustomerProfile;
  allTags: string[];
  cities: string[];
}) {
  const { t, label } = useI18n();
  const upsert = useUpsertCustomerProfile();
  const [name, setName] = useState(initial.display_name);
  const [city, setCity] = useState<string | null>(initial.city);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [otherText, setOtherText] = useState(initial.other_tag_text ?? '');
  const [timing, setTiming] = useState<StartTiming | null>(initial.start_timing);
  const [days, setDays] = useState<string[]>(initial.days);
  const [times, setTimes] = useState<string[]>(initial.times);
  const [pay, setPay] = useState(initial.pay_amount != null ? String(initial.pay_amount) : '');
  const [payType, setPayType] = useState<PayType>(initial.pay_type);
  const [description, setDescription] = useState(initial.description);
  const [active, setActive] = useState(initial.is_active);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useSavedFlash();

  const submit = async () => {
    if (!name.trim()) return setError(t('onb.nameRequired'));
    if (!city) return setError(t('onb.cityRequired'));
    if (tags.length === 0) return setError(t('onb.tagsRequired'));
    if (tags.includes('other') && !otherText.trim()) return setError(t('onb.otherRequired'));
    if (!timing) return setError(t('onb.timingRequired'));
    if (days.length === 0) return setError(t('onb.daysRequired'));
    if (times.length === 0) return setError(t('onb.timesRequired'));
    const amount = pay.trim() ? Number(pay) : null;
    if (amount != null && (!Number.isFinite(amount) || amount < 0)) return setError(t('onb.payInvalid'));
    setError(null);
    try {
      await upsert.mutateAsync({
        display_name: name.trim(),
        city,
        tags,
        other_tag_text: tags.includes('other') ? otherText.trim() : null,
        description: description.trim(),
        pay_amount: amount,
        pay_type: payType,
        start_timing: timing,
        days,
        times,
        is_active: active,
      });
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <>
      {error ? <InlineMessage message={error} /> : null}
      {saved ? <InlineMessage message={t('profile.saved')} tone="success" /> : null}
      <Field label={t('onb.c.name')}>
        <Input value={name} onChangeText={setName} />
      </Field>
      <Field label={t('common.city')}>
        <Select value={city} options={cities} onChange={setCity} placeholder={t('common.city')} />
      </Field>
      <TagPicker tags={allTags} value={tags} onChange={setTags} otherText={otherText} onOtherTextChange={setOtherText} />
      <Field label={t('onb.c.timingTitle')}>
        <ChipRadio options={START_TIMINGS} value={timing} onChange={setTiming} labelFor={(v) => label('startTimings', v)} />
      </Field>
      <Field label={t('common.days')}>
        <ChipGroup options={DAYS} value={days} onChange={setDays} labelFor={(v) => label('days', v)} />
      </Field>
      <Field label={t('common.times')}>
        <ChipGroup options={TIMES} value={times} onChange={setTimes} labelFor={(v) => label('times', v)} />
      </Field>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 140 }}>
          <Field label={t('onb.c.payAmount')} optional>
            <Input value={pay} onChangeText={setPay} keyboardType="decimal-pad" placeholder="25" />
          </Field>
        </View>
      </Row>
      <Field label={t('onb.c.payType')}>
        <ChipRadio options={PAY_TYPES} value={payType} onChange={(v) => setPayType(v ?? 'hourly')} labelFor={(v) => label('payTypes', v)} />
      </Field>
      <Field label={t('onb.c.description')} optional>
        <Input value={description} onChangeText={setDescription} multiline placeholder={t('onb.c.descPlaceholder')} />
      </Field>
      <Toggle label={t('profile.active')} value={active} onChange={setActive} />
      <Button title={t('common.save')} onPress={submit} loading={upsert.isPending} style={{ marginTop: spacing.md }} />
    </>
  );
}
