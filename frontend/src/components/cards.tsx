import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from './Chip';
import { Badge, Card, Row } from './ui';
import type { ConnectionSummary, CustomerProfile, WorkerProfile } from '@/api/types';
import { useI18n } from '@/i18n';
import { displayPhone } from '@/lib/phone';
import { colors, spacing, text } from '@/theme';

type Labeler = (g: 'payTypes' | 'days' | 'times' | 'startTimings' | 'tags', v: string) => string;

export function formatPay(amount: number | null, payType: string, label: Labeler): string {
  if (amount == null) return '';
  const n = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
  return `$${n} ${label('payTypes', payType)}`;
}

export function formatSchedule(days: string[], times: string[], label: Labeler): string {
  const d = days.map((x) => label('days', x)).join(', ');
  const tm = times.map((x) => label('times', x)).join(', ');
  return [d, tm].filter(Boolean).join(' · ');
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

/** Connection state relative to the viewer, as a badge. */
export function ConnectionBadge({
  connection,
  viewerRole,
}: {
  connection: ConnectionSummary | null;
  viewerRole: 'worker' | 'customer';
}) {
  const { t, label } = useI18n();
  if (!connection) return null;
  const mine = connection.initiated_by === viewerRole;
  const lbl =
    connection.status === 'pending'
      ? mine
        ? t('conn.pendingSent')
        : t('conn.pendingReceived')
      : label('connectionStatus', connection.status);
  return <Badge label={lbl} tone={connection.status} />;
}

/** Tap-to-call link for a revealed phone number. */
export function PhoneLink({ phone }: { phone: string }) {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => Linking.openURL(`tel:${phone}`)}
      style={s.phone}
      {...({ href: `tel:${phone}` } as object)}>
      <Text style={s.phoneText}>{t('common.call', { phone: displayPhone(phone) })}</Text>
    </Pressable>
  );
}

export function MatchScore({ score }: { score: number }) {
  const { t } = useI18n();
  if (!score) return null;
  return <Text style={s.score}>{t('common.match', { n: score })}</Text>;
}

/** A household's need, as seen by a worker. */
export function CustomerCard({
  customer,
  onPress,
  showScore,
}: {
  customer: CustomerProfile;
  onPress: () => void;
  showScore?: boolean;
}) {
  const { t, label } = useI18n();
  return (
    <Card onPress={onPress}>
      <View style={s.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={text.h3}>{customer.display_name}</Text>
          <Text style={text.muted}>{customer.city}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {showScore ? <MatchScore score={customer.match_score} /> : null}
          <ConnectionBadge connection={customer.connection} viewerRole="worker" />
        </View>
      </View>
      <View style={{ marginTop: spacing.sm }}>
        <TagRow tags={customer.tags} otherText={customer.other_tag_text} />
      </View>
      <View style={{ marginTop: spacing.sm, gap: 2 }}>
        {customer.pay_amount != null ? (
          <Text style={s.pay}>{formatPay(customer.pay_amount, customer.pay_type, label)}</Text>
        ) : null}
        <Text style={text.muted}>
          {t('card.start')}: {label('startTimings', customer.start_timing)}
        </Text>
        <Text style={text.muted}>{formatSchedule(customer.days, customer.times, label)}</Text>
      </View>
    </Card>
  );
}

/** A worker's profile, as seen by a household. */
export function WorkerCard({
  worker,
  onPress,
  showScore,
}: {
  worker: WorkerProfile;
  onPress: () => void;
  showScore?: boolean;
}) {
  const { t, label } = useI18n();
  return (
    <Card onPress={onPress}>
      <View style={s.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={text.h3}>{worker.display_name}</Text>
          <Text style={text.muted}>{t('common.yearsExperience', { n: worker.years_experience })}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {worker.hourly_rate != null ? (
            <Text style={s.pay}>{t('common.perHour', { n: worker.hourly_rate })}</Text>
          ) : null}
          {showScore ? <MatchScore score={worker.match_score} /> : null}
          <ConnectionBadge connection={worker.connection} viewerRole="customer" />
        </View>
      </View>
      <View style={{ marginTop: spacing.sm }}>
        <TagRow tags={worker.tags} otherText={worker.other_tag_text} />
      </View>
      <Text style={[text.muted, { marginTop: spacing.sm }]}>{formatSchedule(worker.days, worker.times, label)}</Text>
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
  score: { fontSize: 12, fontWeight: '600', color: colors.success },
  phone: {
    backgroundColor: colors.success,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  phoneText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
