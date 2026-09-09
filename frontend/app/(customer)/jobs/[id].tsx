import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { errorMessage, isApiError } from '@/api/client';
import { useDecideApplication, useJob, useJobApplications, useUpdateJob } from '@/api/hooks';
import type { Application } from '@/api/types';
import { Back } from '@/components/Back';
import { formatPay, TagRow } from '@/components/cards';
import { confirm, notify } from '@/components/notify';
import { Badge, Button, Card, EmptyState, ErrorView, InlineMessage, Loading, Row, Screen, Section } from '@/components/ui';
import { useI18n } from '@/i18n';
import { JobForm } from '@/screens/JobForm';
import { colors, spacing, text } from '@/theme';

export default function CustomerJobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, label } = useI18n();
  const job = useJob(id);
  const update = useUpdateJob(id ?? '');
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const setStatus = async (status: 'open' | 'closed') => {
    if (status === 'closed') {
      const ok = await confirm(t('myjobs.confirmClose'), { ok: t('myjobs.closeJob'), cancel: t('common.cancel') });
      if (!ok) return;
    }
    try {
      await update.mutateAsync({ status });
    } catch (e) {
      notify(errorMessage(e));
    }
  };

  return (
    <Screen>
      <Back fallback="/(customer)/jobs" />
      {job.isPending ? (
        <Loading />
      ) : job.isError ? (
        <ErrorView message={isApiError(job.error, 404) ? t('jobs.notFound') : job.error.message} />
      ) : editing ? (
        <>
          <Text style={[text.h1, { marginBottom: spacing.md }]}>{t('myjobs.editJob')}</Text>
          <JobForm
            initial={job.data}
            submitLabel={t('common.save')}
            submitting={update.isPending}
            error={editError}
            onCancel={() => setEditing(false)}
            onSubmit={async (body) => {
              setEditError(null);
              try {
                await update.mutateAsync(body);
                setEditing(false);
              } catch (e) {
                setEditError(errorMessage(e));
              }
            }}
          />
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
            <Text style={[text.h1, { flex: 1 }]}>{job.data.title}</Text>
            <Badge label={label('jobStatus', job.data.status)} tone={job.data.status} />
          </View>
          <Text style={[text.muted, { marginTop: spacing.xs }]}>{job.data.city}</Text>
          <View style={{ marginTop: spacing.md }}>
            <TagRow tags={job.data.tags} otherText={job.data.other_tag_text} />
          </View>
          <Card style={{ marginTop: spacing.md }}>
            <Text style={text.label}>{t('jobs.pay')}</Text>
            <Text style={s.pay}>{formatPay(job.data.pay_amount, job.data.pay_type, label)}</Text>
            {job.data.schedule ? (
              <>
                <Text style={[text.label, { marginTop: spacing.md }]}>{t('jobs.schedule')}</Text>
                <Text style={text.body}>{job.data.schedule}</Text>
              </>
            ) : null}
            {job.data.description ? (
              <>
                <Text style={[text.label, { marginTop: spacing.md }]}>{t('jobs.description')}</Text>
                <Text style={text.body}>{job.data.description}</Text>
              </>
            ) : null}
          </Card>
          <Row style={{ marginTop: spacing.sm }}>
            <Button title={t('myjobs.editJob')} variant="secondary" small onPress={() => setEditing(true)} />
            {job.data.status === 'open' ? (
              <Button title={t('myjobs.closeJob')} variant="danger" small onPress={() => setStatus('closed')} loading={update.isPending} />
            ) : (
              <Button title={t('myjobs.reopenJob')} variant="secondary" small onPress={() => setStatus('open')} loading={update.isPending} />
            )}
          </Row>
          <Applicants jobId={job.data.id} />
        </>
      )}
    </Screen>
  );
}

function Applicants({ jobId }: { jobId: string }) {
  const { t } = useI18n();
  const apps = useJobApplications(jobId);
  return (
    <Section title={t('myjobs.applicants')}>
      {apps.isPending ? (
        <Loading />
      ) : apps.isError ? (
        <InlineMessage message={apps.error.message} />
      ) : apps.data.length === 0 ? (
        <EmptyState message={t('jobs.noApplicants')} />
      ) : (
        apps.data.map((a) => <ApplicantCard key={a.id} application={a} jobId={jobId} />)
      )}
    </Section>
  );
}

function ApplicantCard({ application: a, jobId }: { application: Application; jobId: string }) {
  const { t, label } = useI18n();
  const router = useRouter();
  const decide = useDecideApplication(jobId);
  const w = a.worker;
  const act = async (status: 'accepted' | 'rejected') => {
    try {
      await decide.mutateAsync({ id: a.id, status });
    } catch (e) {
      notify(errorMessage(e));
    }
  };
  return (
    <Card onPress={w ? () => router.push(`/(customer)/workers/${w.user_id}`) : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <Text style={[text.h3, { flex: 1 }]}>{w?.display_name ?? a.worker_id}</Text>
        <Badge label={label('appStatus', a.status)} tone={a.status} />
      </View>
      {w ? (
        <>
          <View style={{ marginTop: spacing.sm }}>
            <TagRow tags={w.tags} otherText={w.other_tag_text} />
          </View>
          <Text style={[text.muted, { marginTop: spacing.sm }]}>
            {t('common.yearsExperience', { n: w.years_experience })}
            {w.hourly_rate != null ? ` · ${t('common.perHour', { n: w.hourly_rate })}` : ''}
            {` · ${w.city}`}
          </Text>
          {w.phone ? <Text style={[text.body, { marginTop: spacing.xs }]}>{w.phone}</Text> : null}
        </>
      ) : null}
      {a.message ? <Text style={[text.body, { marginTop: spacing.sm }]}>{a.message}</Text> : null}
      {a.status === 'pending' ? (
        <Row style={{ marginTop: spacing.md }}>
          <Button title={t('myjobs.accept')} small onPress={() => act('accepted')} loading={decide.isPending} />
          <Button title={t('myjobs.reject')} variant="danger" small onPress={() => act('rejected')} loading={decide.isPending} />
        </Row>
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  pay: { fontSize: 22, fontWeight: '700', color: colors.accent },
});
