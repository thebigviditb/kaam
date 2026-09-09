import { useRouter } from 'expo-router';
import React, { useState } from 'react';

import { errorMessage } from '@/api/client';
import { useCreateJob } from '@/api/hooks';
import { Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { JobForm } from '@/screens/JobForm';

export default function PostJob() {
  const { t } = useI18n();
  const router = useRouter();
  const create = useCreateJob();
  const [error, setError] = useState<string | null>(null);
  // Remount the form after a successful post so it starts blank.
  const [formKey, setFormKey] = useState(0);

  return (
    <Screen title={t('post.title')}>
      <JobForm
        key={formKey}
        submitLabel={t('post.submit')}
        submitting={create.isPending}
        error={error}
        onSubmit={async (body) => {
          setError(null);
          try {
            const job = await create.mutateAsync(body);
            setFormKey((k) => k + 1);
            router.push(`/(customer)/jobs/${job.id}`);
          } catch (e) {
            setError(errorMessage(e));
          }
        }}
      />
    </Screen>
  );
}
