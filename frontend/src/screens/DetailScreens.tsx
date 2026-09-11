import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { isApiError } from '@/api/client';
import { useCustomer, useWorker } from '@/api/hooks';
import { Back } from '@/components/Back';
import { formatCities, formatPay, formatSchedule, MatchScore, TagRow } from '@/components/cards';
import { MediaGallery } from '@/components/MediaGallery';
import { ReportLink, ReportModal } from '@/components/ReportModal';
import { Card, ErrorView, Loading, Screen, Section } from '@/components/ui';
import { useI18n } from '@/i18n';
import { ConnectionPanel } from '@/screens/ConnectionPanel';
import { spacing, text } from '@/theme';

/** A household's need, viewed by a worker. */
export function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, label } = useI18n();
  const q = useCustomer(id);
  const [reporting, setReporting] = useState(false);

  return (
    <Screen>
      <Back fallback="/(worker)/matches" />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorView message={isApiError(q.error, 404) ? t('detail.customerNotFound') : q.error.message} />
      ) : (
        <>
          <Text style={text.h1}>{q.data.display_name}</Text>
          <Text style={[text.muted, { marginTop: spacing.xs }]}>{q.data.city}</Text>
          <MatchScore score={q.data.match_score} />
          <View style={{ marginTop: spacing.md }}>
            <TagRow tags={q.data.tags} otherText={q.data.other_tag_text} />
          </View>
          <Card style={{ marginTop: spacing.md }}>
            {q.data.pay_amount != null ? (
              <>
                <Text style={text.label}>{t('card.pay')}</Text>
                <Text style={[text.body, { marginBottom: spacing.sm }]}>
                  {formatPay(q.data.pay_amount, q.data.pay_type, label)}
                </Text>
              </>
            ) : null}
            <Text style={text.label}>{t('card.start')}</Text>
            <Text style={[text.body, { marginBottom: spacing.sm }]}>{label('startTimings', q.data.start_timing)}</Text>
            <Text style={text.label}>{t('detail.schedule')}</Text>
            <Text style={text.body}>{formatSchedule(q.data.days, q.data.times, label)}</Text>
          </Card>
          {q.data.description ? (
            <Section title={t('detail.need')}>
              <Text style={text.body}>{q.data.description}</Text>
            </Section>
          ) : null}
          <ConnectionPanel
            targetId={q.data.user_id}
            viewerRole="worker"
            connection={q.data.connection}
            phone={q.data.phone}
          />
          <Section title={t('profile.workMedia')}>
            <MediaGallery items={q.data.media ?? []} emptyMessage={t('detail.noMedia')} />
          </Section>
          <ReportLink onPress={() => setReporting(true)} />
          <ReportModal
            visible={reporting}
            onClose={() => setReporting(false)}
            reportedUserId={q.data.user_id}
            reportedName={q.data.display_name}
            connectionId={q.data.connection?.id}
          />
        </>
      )}
    </Screen>
  );
}

/** A worker's profile, viewed by a household. */
export function WorkerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, label } = useI18n();
  const q = useWorker(id);
  const [reporting, setReporting] = useState(false);

  return (
    <Screen>
      <Back fallback="/(customer)/matches" />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorView message={isApiError(q.error, 404) ? t('detail.workerNotFound') : q.error.message} />
      ) : (
        <>
          <Text style={text.h1}>{q.data.display_name}</Text>
          <Text style={[text.muted, { marginTop: spacing.xs }]}>
            {t('common.yearsExperience', { n: q.data.years_experience })}
            {q.data.hourly_rate != null ? ` · ${t('common.perHour', { n: q.data.hourly_rate })}` : ''}
          </Text>
          <Text style={[text.muted, { marginTop: 2 }]}>{formatCities(q.data.city, q.data.work_cities ?? [], t)}</Text>
          <MatchScore score={q.data.match_score} />
          <View style={{ marginTop: spacing.md }}>
            <TagRow tags={q.data.tags} otherText={q.data.other_tag_text} />
          </View>
          <Card style={{ marginTop: spacing.md }}>
            <Text style={text.label}>{t('detail.schedule')}</Text>
            <Text style={text.body}>{formatSchedule(q.data.days, q.data.times, label)}</Text>
          </Card>
          {q.data.bio ? (
            <Section title={t('detail.about')}>
              <Text style={text.body}>{q.data.bio}</Text>
            </Section>
          ) : null}
          <ConnectionPanel
            targetId={q.data.user_id}
            viewerRole="customer"
            connection={q.data.connection}
            phone={q.data.phone}
          />
          <Section title={t('detail.gallery')}>
            <MediaGallery items={q.data.media} emptyMessage={t('detail.noMedia')} />
          </Section>
          <ReportLink onPress={() => setReporting(true)} />
          <ReportModal
            visible={reporting}
            onClose={() => setReporting(false)}
            reportedUserId={q.data.user_id}
            reportedName={q.data.display_name}
            connectionId={q.data.connection?.id}
          />
        </>
      )}
    </Screen>
  );
}
