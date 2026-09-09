import React from 'react';

import { AppTabs } from '@/components/Tabs';
import { useI18n } from '@/i18n';

export default function CustomerLayout() {
  const { t } = useI18n();
  return (
    <AppTabs
      tabs={[
        { name: 'jobs', title: t('tabs.myJobs'), icon: 'list-outline' },
        { name: 'post-job', title: t('tabs.postJob'), icon: 'add-circle-outline' },
        { name: 'workers', title: t('tabs.workers'), icon: 'people-outline' },
        { name: 'profile', title: t('tabs.profile'), icon: 'person-outline' },
        { name: 'settings', title: t('tabs.settings'), icon: 'settings-outline' },
      ]}
    />
  );
}
