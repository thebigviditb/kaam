import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { errorMessage, isApiError } from '@/api/client';
import { useApply, useJob } from '@/api/hooks';
import { Back } from '@/components/Back';
import { formatPay, TagRow } from '@/components/cards';
import { Badge, Button, Card, ErrorView, Field, InlineMessage, Input, Loading, Screen, Section } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, spacing, text } from '@/theme';

export default function WorkerJobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, label } = useI18n();
  const job = useJob(id);
  const apply = useApply(id ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError(null);
    try {
      await apply.mutateAsync(message.trim());
      setSent(true);
    } catch (e) {
      setError(isApiError(e, 409) ? t('jobs.alreadyApplied') : errorMessage(e));
    }
  };

  return (
    <Screen>
      <Back fallback="/(worker)/jobs" />
      {job.isPending ? (
        <Loading />
      ) : job.isError ? (
        <ErrorView message={isApiError(job.error, 404) ? t('jobs.notFound') : job.error.message} />
      ) : (
        <>
          <Text style={text.h1}>{job.data.title}</Text>
          <Text style={[text.muted, { marginTop: spacing.xs }]}>
            {job.data.customer_name ? `${t('jobs.postedBy', { name: job.data.customer_name })} · ` : ''}
            {job.data.city}
          </Text>
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

          {job.data.my_application_status || sent ? (
            <Section title={t('jobs.yourStatus')}>
              <Badge
                label={label('appStatus', job.data.my_application_status ?? 'pending')}
                tone={job.data.my_application_status ?? 'pending'}
              />
              {sent ? <InlineMessage message={t('jobs.applicationSent')} tone="success" /> : null}
            </Section>
          ) : job.data.status !== 'open' ? (
            <Section title={t('common.status')}>
              <Text style={text.muted}>{t('jobs.notOpen')}</Text>
            </Section>
          ) : (
            <Section title={t('jobs.applyTitle')}>
              {error ? <InlineMessage message={error} /> : null}
              <Field label={t('jobs.message')} optional>
                <Input value={message} onChangeText={setMessage} multiline placeholder={t('jobs.messagePlaceholder')} />
              </Field>
              <Button title={t('jobs.sendApplication')} onPress={submit} loading={apply.isPending} />
            </Section>
          )}
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  pay: { fontSize: 22, fontWeight: '700', color: colors.accent },
});
