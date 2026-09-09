import React, { useEffect, useState } from 'react';

import { errorMessage } from '@/api/client';
import { useMeta, useMyCustomerProfile, useUpsertCustomerProfile } from '@/api/hooks';
import { Select } from '@/components/Select';
import { Button, Field, InlineMessage, Input, Loading, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { spacing } from '@/theme';

export default function CustomerProfileScreen() {
  const { t } = useI18n();
  const profile = useMyCustomerProfile();
  const meta = useMeta();
  if (profile.isPending || !meta.data) return <Loading />;
  return (
    <Screen title={profile.data ? t('profile.title') : t('profile.setupTitle')} subtitle={t('profile.customerIntro')}>
      <Form initial={profile.data} cities={meta.data.cities} />
    </Screen>
  );
}

function Form({ initial, cities }: { initial: { display_name: string; city: string } | null | undefined; cities: string[] }) {
  const { t } = useI18n();
  const upsert = useUpsertCustomerProfile();
  const [displayName, setDisplayName] = useState(initial?.display_name ?? '');
  const [city, setCity] = useState<string | null>(initial?.city ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(id);
  }, [saved]);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.name = t('profile.nameRequired');
    if (!city) e.city = t('profile.cityRequired');
    setErrors(e);
    if (Object.keys(e).length) return;
    setServerError(null);
    try {
      await upsert.mutateAsync({ display_name: displayName.trim(), city: city as string });
      setSaved(true);
    } catch (err) {
      setServerError(errorMessage(err));
    }
  };

  return (
    <>
      {serverError ? <InlineMessage message={serverError} /> : null}
      {saved ? <InlineMessage message={t('profile.saved')} tone="success" /> : null}
      <Field label={t('profile.displayName')} error={errors.name}>
        <Input value={displayName} onChangeText={setDisplayName} error={Boolean(errors.name)} />
      </Field>
      <Field label={t('common.city')} error={errors.city}>
        <Select value={city} options={cities} onChange={setCity} placeholder={t('common.city')} error={Boolean(errors.city)} />
      </Field>
      <Button title={t('common.save')} onPress={submit} loading={upsert.isPending} style={{ marginTop: spacing.sm }} />
    </>
  );
}
