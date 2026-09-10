import { useRouter } from 'expo-router';
import React from 'react';

import { useMatchingCustomers, useMatchingWorkers } from '@/api/hooks';
import { CustomerCard, WorkerCard } from '@/components/cards';
import { EmptyState, ErrorView, Loading, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';

/** Worker's Matches tab: households ranked by fit. */
export function WorkerMatches() {
  const { t } = useI18n();
  const router = useRouter();
  const q = useMatchingCustomers();
  return (
    <Screen title={t('matches.workerTitle')} subtitle={t('matches.workerHint')}>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorView message={q.error.message} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState message={t('matches.emptyWorker')} />
      ) : (
        q.data.map((c) => (
          <CustomerCard
            key={c.user_id}
            customer={c}
            showScore
            onPress={() => router.push({ pathname: '/(worker)/customers/[id]', params: { id: c.user_id } })}
          />
        ))
      )}
    </Screen>
  );
}

/** Household's Matches tab: workers ranked by fit. */
export function CustomerMatches() {
  const { t } = useI18n();
  const router = useRouter();
  const q = useMatchingWorkers();
  return (
    <Screen title={t('matches.customerTitle')} subtitle={t('matches.customerHint')}>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorView message={q.error.message} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState message={t('matches.emptyCustomer')} />
      ) : (
        q.data.map((w) => (
          <WorkerCard
            key={w.user_id}
            worker={w}
            showScore
            onPress={() => router.push({ pathname: '/(customer)/workers/[id]', params: { id: w.user_id } })}
          />
        ))
      )}
    </Screen>
  );
}
