import React from 'react';

import { useUnreadTotal } from '@/api/hooks';
import { AppTabs } from '@/components/Tabs';
import { useI18n } from '@/i18n';

export default function CustomerLayout() {
  const { t } = useI18n();
  const unread = useUnreadTotal();
  return (
    <AppTabs
      tabs={[
        { name: 'matches', title: t('tabs.matches'), icon: 'sparkles-outline' },
        { name: 'browse', title: t('tabs.browse'), icon: 'search-outline' },
        { name: 'connections', title: t('tabs.connections'), icon: 'people-outline', badge: unread },
        { name: 'profile', title: t('tabs.profile'), icon: 'person-outline' },
        { name: 'settings', title: t('tabs.settings'), icon: 'settings-outline' },
      ]}
      hidden={['workers/[id]', 'chat/[id]']}
    />
  );
}
