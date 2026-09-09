import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useMeta, useWorkers } from '@/api/hooks';
import type { WorkerFilters } from '@/api/types';
import { WorkerCard } from '@/components/cards';
import { ChipGroup } from '@/components/Chip';
import { Select } from '@/components/Select';
import { Button, EmptyState, ErrorView, Field, Input, Loading, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { spacing } from '@/theme';

export default function FindWorkers() {
  const { t, label } = useI18n();
  const router = useRouter();
  const meta = useMeta();
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<WorkerFilters>({});
  const [search, setSearch] = useState('');

  // Debounce the free-text search.
  useEffect(() => {
    const id = setTimeout(() => setFilters((f) => ({ ...f, q: search.trim() || undefined })), 300);
    return () => clearTimeout(id);
  }, [search]);

  const workers = useWorkers(filters);
  const active = (filters.tags?.length ?? 0) + (filters.city ? 1 : 0) + (filters.max_rate ? 1 : 0) + (filters.min_experience ? 1 : 0);

  return (
    <Screen title={t('workers.title')}>
      <Input value={search} onChangeText={setSearch} placeholder={t('workers.searchPlaceholder')} />
      <View style={{ marginVertical: spacing.md }}>
        <Button
          title={`${open ? t('common.hideFilters') : t('common.showFilters')}${active ? ` (${active})` : ''}`}
          variant="secondary"
          small
          onPress={() => setOpen((o) => !o)}
          style={{ alignSelf: 'flex-start' }}
        />
        {open && meta.data ? (
          <View style={{ marginTop: spacing.md }}>
            <Field label={t('common.tags')}>
              <ChipGroup
                options={meta.data.tags}
                value={filters.tags ?? []}
                onChange={(tags) => setFilters({ ...filters, tags: tags.length ? tags : undefined })}
                labelFor={(x) => label('tags', x)}
              />
            </Field>
            <Field label={t('common.city')}>
              <Select
                value={filters.city ?? null}
                options={meta.data.cities}
                onChange={(city) => setFilters({ ...filters, city: city ?? undefined })}
                placeholder={t('common.any')}
                allowClear
              />
            </Field>
            <Field label={t('workers.maxRate')}>
              <Input
                value={filters.max_rate != null ? String(filters.max_rate) : ''}
                keyboardType="decimal-pad"
                placeholder={t('common.any')}
                onChangeText={(v) => {
                  const n = Number(v);
                  setFilters({ ...filters, max_rate: v && Number.isFinite(n) && n > 0 ? n : undefined });
                }}
              />
            </Field>
            <Field label={t('workers.minExperience')}>
              <Input
                value={filters.min_experience != null ? String(filters.min_experience) : ''}
                keyboardType="number-pad"
                placeholder="0"
                onChangeText={(v) => {
                  const n = Number(v);
                  setFilters({ ...filters, min_experience: v && Number.isFinite(n) && n > 0 ? Math.round(n) : undefined });
                }}
              />
            </Field>
            {active ? (
              <Button title={t('common.clear')} variant="ghost" small onPress={() => setFilters({ q: filters.q })} style={{ alignSelf: 'flex-start' }} />
            ) : null}
          </View>
        ) : null}
      </View>

      {workers.isPending ? (
        <Loading />
      ) : workers.isError ? (
        <ErrorView message={workers.error.message} onRetry={() => workers.refetch()} />
      ) : workers.data.length === 0 ? (
        <EmptyState message={t('workers.empty')} />
      ) : (
        workers.data.map((w) => (
          <WorkerCard key={w.user_id} worker={w} onPress={() => router.push(`/(customer)/workers/${w.user_id}`)} />
        ))
      )}
    </Screen>
  );
}
