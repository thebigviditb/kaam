import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { useMyApplications } from '@/api/hooks';
import { formatPay, TagRow } from '@/components/cards';
import { Badge, Card, EmptyState, ErrorView, Loading, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, spacing, text } from '@/theme';

export default function MyApplications() {
  const { t, label } = useI18n();
  const router = useRouter();
  const apps = useMyApplications();

  return (
    <Screen title={t('apps.title')}>
      {apps.isPending ? (
        <Loading />
      ) : apps.isError ? (
        <ErrorView message={apps.error.message} onRetry={() => apps.refetch()} />
      ) : apps.data.length === 0 ? (
        <EmptyState message={t('apps.empty')} />
      ) : (
        apps.data.map((a) => (
          <Card key={a.id} onPress={() => router.push(`/(worker)/jobs/${a.job_id}`)}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
              <Text style={[text.h3, { flex: 1 }]}>{a.job?.title ?? a.job_id}</Text>
              <Badge label={label('appStatus', a.status)} tone={a.status} />
            </View>
            {a.job ? (
              <>
                <View style={{ marginTop: spacing.sm }}>
                  <TagRow tags={a.job.tags} otherText={a.job.other_tag_text} />
                </View>
                <Text style={{ marginTop: spacing.sm, color: colors.accent, fontWeight: '600' }}>
                  {formatPay(a.job.pay_amount, a.job.pay_type, label)}
                </Text>
                <Text style={text.muted}>
                  {a.job.city}
                  {a.job.customer_name ? ` · ${a.job.customer_name}` : ''}
                  {` · ${label('jobStatus', a.job.status)}`}
                </Text>
              </>
            ) : null}
            {a.message ? (
              <Text style={[text.muted, { marginTop: spacing.sm }]} numberOfLines={3}>
                {t('apps.yourMessage')}: {a.message}
              </Text>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
