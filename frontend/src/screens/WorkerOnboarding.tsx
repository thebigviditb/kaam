import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { keys, useMeta, useUpsertWorkerProfile } from '@/api/hooks';
import { DAYS, TIMES, type User } from '@/api/types';
import { ChipGroup } from '@/components/Chip';
import { TagPicker } from '@/components/TagPicker';
import { Field, Input, Loading, Row } from '@/components/ui';
import { WizardStep } from '@/components/Wizard';
import { useI18n } from '@/i18n';
import { MediaSection } from '@/screens/MediaSection';

const TOTAL = 5;

/** The worker's profile, one question per screen. PUT /workers/me happens at step 4; step 5 is optional media. */
export function WorkerOnboarding() {
  const { t, label } = useI18n();
  const meta = useMeta();
  const upsert = useUpsertWorkerProfile();
  const qc = useQueryClient();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [years, setYears] = useState('');
  const [rate, setRate] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!meta.data) return <Loading />;

  const next = () => {
    setError(null);
    setStep((s) => s + 1);
  };
  const back = step > 1 && step < 5 ? () => setStep((s) => s - 1) : undefined;

  const save = async () => {
    const yrs = years.trim() ? Number(years) : 0;
    if (!Number.isInteger(yrs) || yrs < 0 || yrs > 60) return setError(t('onb.yearsInvalid'));
    const rt = rate.trim() ? Number(rate) : null;
    if (rt != null && (!Number.isFinite(rt) || rt < 0)) return setError(t('onb.rateInvalid'));
    setError(null);
    try {
      await upsert.mutateAsync({
        display_name: name.trim(),
        bio: bio.trim(),
        tags,
        other_tag_text: tags.includes('other') ? otherText.trim() : null,
        years_experience: yrs,
        hourly_rate: rt,
        days,
        times,
        is_visible: true,
      });
      qc.setQueryData<User | null>(keys.me, (u) => (u ? { ...u, onboarded: true } : u));
      next();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const finish = () => router.replace('/(worker)/matches');

  switch (step) {
    case 1:
      return (
        <WizardStep
          step={1}
          total={TOTAL}
          title={t('onb.w.nameTitle')}
          error={error}
          onNext={() => {
            if (!name.trim()) return setError(t('onb.nameRequired'));
            next();
          }}>
          <Field label={t('onb.w.name')}>
            <Input value={name} onChangeText={setName} placeholder={t('onb.w.namePlaceholder')} autoFocus />
          </Field>
          <Field label={t('onb.w.bio')} optional>
            <Input value={bio} onChangeText={setBio} multiline placeholder={t('onb.w.bioPlaceholder')} />
          </Field>
        </WizardStep>
      );
    case 2:
      return (
        <WizardStep
          step={2}
          total={TOTAL}
          title={t('onb.w.tagsTitle')}
          hint={t('onb.w.tagsHint')}
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
          title={t('onb.w.availTitle')}
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
          <Field label={t('common.times')}>
            <ChipGroup options={TIMES} value={times} onChange={setTimes} labelFor={(v) => label('times', v)} big />
          </Field>
        </WizardStep>
      );
    case 4:
      return (
        <WizardStep
          step={4}
          total={TOTAL}
          title={t('onb.w.expTitle')}
          error={error}
          onBack={back}
          onNext={save}
          nextLoading={upsert.isPending}>
          <Row style={{ alignItems: 'flex-start' }}>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Field label={t('onb.w.years')}>
                <Input value={years} onChangeText={setYears} keyboardType="number-pad" placeholder="0" />
              </Field>
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Field label={t('onb.w.rate')} optional>
                <Input value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="25" />
              </Field>
            </View>
          </Row>
        </WizardStep>
      );
    default:
      return (
        <WizardStep
          step={5}
          total={TOTAL}
          title={t('onb.w.mediaTitle')}
          hint={t('onb.w.mediaHint')}
          onNext={finish}
          nextLabel={t('onb.w.finish')}
          secondary={{ label: t('common.skip'), onPress: finish }}>
          <MediaSection />
        </WizardStep>
      );
  }
}
