import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from './Chip';
import { Badge, Card, Row } from './ui';
import type { Job, WorkerProfile } from '@/api/types';
import { useI18n } from '@/i18n';
import { colors, spacing, text } from '@/theme';

export function formatPay(amount: number, payType: string, label: (g: 'payTypes', v: string) => string) {
  const n = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
  return `$${n} ${label('payTypes', payType)}`;
}

export function TagRow({ tags, otherText }: { tags: string[]; otherText?: string | null }) {
  const { label } = useI18n();
  return (
    <Row style={{ gap: 6 }}>
      {tags.map((tg) => (
        <Chip key={tg} small label={tg === 'other' && otherText ? otherText : label('tags', tg)} />
      ))}
    </Row>
  );
}

export function JobCard({
  job,
  onPress,
  showApplicants,
}: {
  job: Job;
  onPress: () => void;
  showApplicants?: boolean;
}) {
  const { t, label } = useI18n();
  return (
    <Card onPress={onPress}>
      <View style={s.titleRow}>
        <Text style={[text.h3, { flex: 1 }]} numberOfLines={2}>
          {job.title}
        </Text>
        {job.my_application_status ? (
          <Badge label={label('appStatus', job.my_application_status)} tone={job.my_application_status} />
        ) : job.status !== 'open' || showApplicants ? (
          <Badge label={label('jobStatus', job.status)} tone={job.status} />
        ) : null}
      </View>
      <View style={{ marginTop: spacing.sm }}>
        <TagRow tags={job.tags} otherText={job.other_tag_text} />
      </View>
      <Text style={[s.pay, { marginTop: spacing.sm }]}>{formatPay(job.pay_amount, job.pay_type, label)}</Text>
      <Text style={text.muted}>
        {job.city}
        {job.customer_name ? ` · ${job.customer_name}` : ''}
        {showApplicants
          ? ` · ${job.application_count === 1 ? t('jobs.applicant') : t('jobs.applicants', { n: job.application_count })}`
          : ''}
      </Text>
    </Card>
  );
}

export function WorkerCard({ worker, onPress }: { worker: WorkerProfile; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Card onPress={onPress}>
      <View style={s.titleRow}>
        <Text style={[text.h3, { flex: 1 }]}>{worker.display_name}</Text>
        {worker.hourly_rate != null ? (
          <Text style={s.pay}>{t('common.perHour', { n: worker.hourly_rate })}</Text>
        ) : null}
      </View>
      <View style={{ marginTop: spacing.sm }}>
        <TagRow tags={worker.tags} otherText={worker.other_tag_text} />
      </View>
      <Text style={[text.muted, { marginTop: spacing.sm }]}>
        {worker.city} · {t('common.yearsExperience', { n: worker.years_experience })}
      </Text>
      {worker.bio ? (
        <Text style={[text.muted, { marginTop: spacing.xs }]} numberOfLines={2}>
          {worker.bio}
        </Text>
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  pay: { fontSize: 15, fontWeight: '600', color: colors.accent },
});
