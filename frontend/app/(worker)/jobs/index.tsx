import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { isApiError } from '@/api/client';
import { useJobs, useMatchingJobs, useMeta } from '@/api/hooks';
import type { JobFilters } from '@/api/types';
import { JobCard } from '@/components/cards';
import { EmptyState, ErrorView, Loading, Screen, Toggle } from '@/components/ui';
import { useI18n } from '@/i18n';
import { JobFilterPanel } from '@/screens/JobFilters';
import { spacing, text } from '@/theme';

export default function WorkerJobs() {
  const { t } = useI18n();
  const router = useRouter();
  const meta = useMeta();
  const [matching, setMatching] = useState(false);
  const [filters, setFilters] = useState<JobFilters>({});
  const jobs = useJobs(filters, !matching);
  const matchingJobs = useMatchingJobs(matching);
  const active = matching ? matchingJobs : jobs;

  return (
    <Screen title={t('jobs.title')}>
      <Toggle label={t('jobs.matching')} value={matching} onChange={setMatching} />
      {matching ? (
        <Text style={[text.small, { marginBottom: spacing.md }]}>{t('jobs.matchingHint')}</Text>
      ) : meta.data ? (
        <View style={{ marginTop: spacing.sm }}>
          <JobFilterPanel meta={meta.data} value={filters} onChange={setFilters} />
        </View>
      ) : null}

      {active.isPending ? (
        <Loading />
      ) : active.isError ? (
        matching && isApiError(active.error, 404) ? (
          <EmptyState message={t('jobs.needProfile')} />
        ) : (
          <ErrorView message={active.error.message} onRetry={() => active.refetch()} />
        )
      ) : active.data.length === 0 ? (
        <EmptyState message={t('jobs.empty')} />
      ) : (
        active.data.map((job) => (
          <JobCard key={job.id} job={job} onPress={() => router.push(`/(worker)/jobs/${job.id}`)} />
        ))
      )}
    </Screen>
  );
}
