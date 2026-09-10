import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useMeta, useWorkers } from '@/api/hooks';
import { DAYS, TIMES, type WorkerFilters } from '@/api/types';
import { WorkerCard } from '@/components/cards';
import { ChipGroup } from '@/components/Chip';
import { Select } from '@/components/Select';
import { Button, EmptyState, ErrorView, Field, Input, Loading, Row, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { spacing } from '@/theme';

function useDebounced<T>(value: T, ms = 400): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function num(s: string): number | undefined {
  const n = Number(s);
  return s.trim() && Number.isFinite(n) ? n : undefined;
}

/** Household browsing workers. */
export function BrowseWorkers() {
  const { t, label } = useI18n();
  const router = useRouter();
  const meta = useMeta();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [city, setCity] = useState<string | null>(null);
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [maxRate, setMaxRate] = useState('');
  const [minExp, setMinExp] = useState('');
  const dq = useDebounced(q.trim());
  const dMax = useDebounced(maxRate);
  const dExp = useDebounced(minExp);

  const filters: WorkerFilters = {
    q: dq || undefined,
    tags,
    city: city ?? undefined,
    days,
    times,
    max_rate: num(dMax),
    min_experience: num(dExp),
  };
  const list = useWorkers(filters);

  return (
    <Screen
      title={t('browse.customerTitle')}
      right={
        <Button
          title={open ? t('common.hideFilters') : t('common.showFilters')}
          variant="secondary"
          small
          onPress={() => setOpen((o) => !o)}
        />
      }>
      <Input value={q} onChangeText={setQ} placeholder={t('browse.searchWorkers')} style={{ marginBottom: spacing.md }} />
      {open ? (
        <View style={{ marginBottom: spacing.md }}>
          <Field label={t('common.tags')}>
            <ChipGroup options={meta.data?.tags ?? []} value={tags} onChange={setTags} labelFor={(v) => label('tags', v)} />
          </Field>
          <Field label={t('common.city')}>
            <Select value={city} options={meta.data?.cities ?? []} onChange={setCity} placeholder={t('common.any')} allowClear />
          </Field>
          <Field label={t('common.days')}>
            <ChipGroup options={DAYS} value={days} onChange={setDays} labelFor={(v) => label('days', v)} />
          </Field>
          <Field label={t('common.times')}>
            <ChipGroup options={TIMES} value={times} onChange={setTimes} labelFor={(v) => label('times', v)} />
          </Field>
          <Row style={{ alignItems: 'flex-start' }}>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Field label={t('browse.maxRate')}>
                <Input value={maxRate} onChangeText={setMaxRate} keyboardType="decimal-pad" placeholder="30" />
              </Field>
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Field label={t('browse.minExperience')}>
                <Input value={minExp} onChangeText={setMinExp} keyboardType="number-pad" placeholder="2" />
              </Field>
            </View>
          </Row>
        </View>
      ) : null}
      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <ErrorView message={list.error.message} onRetry={() => list.refetch()} />
      ) : list.data.length === 0 ? (
        <EmptyState message={t('browse.emptyWorkers')} />
      ) : (
        list.data.map((w) => (
          <WorkerCard
            key={w.user_id}
            worker={w}
            onPress={() => router.push({ pathname: '/(customer)/workers/[id]', params: { id: w.user_id } })}
          />
        ))
      )}
    </Screen>
  );
}
