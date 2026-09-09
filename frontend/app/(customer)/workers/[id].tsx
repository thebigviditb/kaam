import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Linking, Text, View } from 'react-native';

import { isApiError } from '@/api/client';
import { useWorker } from '@/api/hooks';
import { Back } from '@/components/Back';
import { TagRow } from '@/components/cards';
import { MediaGallery } from '@/components/MediaGallery';
import { Button, Card, ErrorView, Loading, Screen, Section } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, spacing, text } from '@/theme';

export default function WorkerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const worker = useWorker(id);

  return (
    <Screen>
      <Back fallback="/(customer)/workers" />
      {worker.isPending ? (
        <Loading />
      ) : worker.isError ? (
        <ErrorView message={isApiError(worker.error, 404) ? t('workers.notFound') : worker.error.message} />
      ) : (
        <>
          <Text style={text.h1}>{worker.data.display_name}</Text>
          <Text style={[text.muted, { marginTop: spacing.xs }]}>
            {worker.data.city} · {t('common.yearsExperience', { n: worker.data.years_experience })}
            {worker.data.hourly_rate != null ? ` · ${t('common.perHour', { n: worker.data.hourly_rate })}` : ''}
          </Text>
          <View style={{ marginTop: spacing.md }}>
            <TagRow tags={worker.data.tags} otherText={worker.data.other_tag_text} />
          </View>
          {worker.data.availability ? (
            <Card style={{ marginTop: spacing.md }}>
              <Text style={text.label}>{t('profile.availability')}</Text>
              <Text style={text.body}>{worker.data.availability}</Text>
            </Card>
          ) : null}
          {worker.data.phone ? (
            <Button
              title={t('workers.call', { phone: worker.data.phone })}
              onPress={() => Linking.openURL(`tel:${worker.data.phone}`)}
              style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
            />
          ) : (
            <Text style={[text.small, { marginTop: spacing.md, color: colors.muted }]}>{t('workers.phoneHidden')}</Text>
          )}
          {worker.data.bio ? (
            <Section title={t('workers.about')}>
              <Text style={text.body}>{worker.data.bio}</Text>
            </Section>
          ) : null}
          <Section title={t('workers.gallery')}>
            <MediaGallery items={worker.data.media} emptyMessage={t('workers.noMedia')} />
          </Section>
        </>
      )}
    </Screen>
  );
}
