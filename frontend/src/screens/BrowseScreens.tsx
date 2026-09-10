import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useCustomers, useMeta, useWorkers } from '@/api/hooks';
import {
  DAYS,
  PAY_TYPES,
  START_TIMINGS,
  TIMES,
  type CustomerFilters,
  type PayType,
  type StartTiming,
  type WorkerFilters,
} from '@/api/types';
import { CustomerCard, WorkerCard } from '@/components/cards';
import { ChipGroup, ChipRadio } from '@/components/Chip';
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

/** Worker browsing households. */
export function BrowseCustomers() {
  const { t, label } = useI18n();
  const router = useRouter();
  const meta = useMeta();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [city, setCity] = useState<string | null>(null);
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [minPay, setMinPay] = useState('');
  const [payType, setPayType] = useState<PayType | null>(null);
  const [timing, setTiming] = useState<StartTiming | null>(null);
  const dq = useDebounced(q.trim());
  const dMin = useDebounced(minPay);

  const filters: CustomerFilters = {
    q: dq || undefined,
    tags,
    city: city ?? undefined,
    days,
    times,
    min_pay: num(dMin),
    pay_type: payType ?? undefined,
    start_timing: timing ?? undefined,
  };
  const list = useCustomers(filters);

  return (
    <Screen
      title={t('browse.workerTitle')}
      right={
        <Button
          title={open ? t('common.hideFilters') : t('common.showFilters')}
          variant="secondary"
          small
          onPress={() => setOpen((o) => !o)}
        />
      }>
      <Input value={q} onChangeText={setQ} placeholder={t('browse.searchCustomers')} style={{ marginBottom: spacing.md }} />
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
              <Field label={t('browse.minPay')}>
                <Input value={minPay} onChangeText={setMinPay} keyboardType="decimal-pad" placeholder="20" />
              </Field>
            </View>
          </Row>
          <Field label={t('browse.payType')}>
            <ChipRadio options={PAY_TYPES} value={payType} onChange={setPayType} labelFor={(v) => label('payTypes', v)} />
          </Field>
          <Field label={t('browse.startTiming')}>
            <ChipRadio options={START_TIMINGS} value={timing} onChange={setTiming} labelFor={(v) => label('startTimings', v)} />
          </Field>
        </View>
      ) : null}
      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <ErrorView message={list.error.message} onRetry={() => list.refetch()} />
      ) : list.data.length === 0 ? (
        <EmptyState message={t('browse.emptyCustomers')} />
      ) : (
        list.data.map((c) => (
          <CustomerCard
            key={c.user_id}
            customer={c}
            onPress={() => router.push({ pathname: '/(worker)/customers/[id]', params: { id: c.user_id } })}
          />
        ))
      )}
    </Screen>
  );
}

/** Household browsing workers. */
export function BrowseWorkers() {
  const { t, label } = useI18n();
  const router = useRouter();
  const meta = useMeta();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [tags, setTags] = useState<string[]>([]);
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
