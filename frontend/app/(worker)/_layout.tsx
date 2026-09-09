import React from 'react';

import { AppTabs } from '@/components/Tabs';
import { useI18n } from '@/i18n';

export default function WorkerLayout() {
  const { t } = useI18n();
  return (
    <AppTabs
      tabs={[
        { name: 'jobs', title: t('tabs.jobs'), icon: 'briefcase-outline' },
        { name: 'applications', title: t('tabs.applications'), icon: 'paper-plane-outline' },
        { name: 'profile', title: t('tabs.profile'), icon: 'person-outline' },
        { name: 'settings', title: t('tabs.settings'), icon: 'settings-outline' },
      ]}
    />
  );
}
