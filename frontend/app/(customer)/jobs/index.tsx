import { useRouter } from 'expo-router';
import React from 'react';

import { useMyJobs } from '@/api/hooks';
import { JobCard } from '@/components/cards';
import { Button, EmptyState, ErrorView, Loading, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';

export default function MyJobs() {
  const { t } = useI18n();
  const router = useRouter();
  const jobs = useMyJobs();

  return (
    <Screen
      title={t('myjobs.title')}
      right={<Button title={t('tabs.postJob')} small onPress={() => router.push('/(customer)/post-job')} />}>
      {jobs.isPending ? (
        <Loading />
      ) : jobs.isError ? (
        <ErrorView message={jobs.error.message} onRetry={() => jobs.refetch()} />
      ) : jobs.data.length === 0 ? (
        <EmptyState message={t('myjobs.empty')} />
      ) : (
        jobs.data.map((job) => (
          <JobCard key={job.id} job={job} showApplicants onPress={() => router.push(`/(customer)/jobs/${job.id}`)} />
        ))
      )}
    </Screen>
  );
}
