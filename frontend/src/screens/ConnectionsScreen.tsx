import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useDecideConnection, useMe, useMyConnections, useWithdrawConnection } from '@/api/hooks';
import type { Connection, Role } from '@/api/types';
import { CustomerCard, PhoneLink, WorkerCard } from '@/components/cards';
import { confirm } from '@/components/notify';
import { Button, EmptyState, ErrorView, InlineMessage, Loading, Row, Screen, Section } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, radius, spacing, text } from '@/theme';

export function ConnectionsScreen() {
  const { t } = useI18n();
  const me = useMe();
  const conns = useMyConnections();
  const role = me.data?.role ?? 'worker';

  if (conns.isPending || !me.data) return <Loading />;
  if (conns.isError) return <ErrorView message={conns.error.message} onRetry={() => conns.refetch()} />;

  const all = conns.data;
  const received = all.filter((c) => c.status === 'pending' && c.initiated_by !== role);
  const sent = all.filter((c) => c.status === 'pending' && c.initiated_by === role);
  const accepted = all.filter((c) => c.status === 'accepted');
  const declined = all.filter((c) => c.status === 'declined');

  return (
    <Screen title={t('conn.title')}>
      {all.length === 0 ? <EmptyState message={t('conn.empty')} /> : null}
      {received.length ? (
        <Section title={t('conn.received')}>
          {received.map((c) => <ConnectionItem key={c.id} c={c} role={role} />)}
        </Section>
      ) : null}
      {accepted.length ? (
        <Section title={t('conn.accepted')}>
          {accepted.map((c) => <ConnectionItem key={c.id} c={c} role={role} />)}
        </Section>
      ) : null}
      {sent.length ? (
        <Section title={t('conn.sent')}>
          {sent.map((c) => <ConnectionItem key={c.id} c={c} role={role} />)}
        </Section>
      ) : null}
      {declined.length ? (
        <Section title={t('conn.declined')}>
          {declined.map((c) => <ConnectionItem key={c.id} c={c} role={role} />)}
        </Section>
      ) : null}
    </Screen>
  );
}

function ConnectionItem({ c, role }: { c: Connection; role: Role }) {
  const { t } = useI18n();
  const router = useRouter();
  const decide = useDecideConnection();
  const withdraw = useWithdrawConnection();
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const mine = c.initiated_by === role;
  const other = role === 'worker' ? c.customer : c.worker;
  const otherPhone = other?.phone ?? null;
  const open = () => {
    if (role === 'worker') router.push({ pathname: '/(worker)/customers/[id]', params: { id: c.customer_id } });
    else router.push({ pathname: '/(customer)/workers/[id]', params: { id: c.worker_id } });
  };

  return (
    <View style={s.item}>
      {role === 'worker' && c.customer ? (
        <CustomerCard customer={c.customer} onPress={open} />
      ) : role === 'customer' && c.worker ? (
        <WorkerCard worker={c.worker} onPress={open} />
      ) : null}
      {c.message ? (
        <View style={s.message}>
          <Text style={text.label}>{mine ? t('conn.yourMessage') : t('conn.theirMessage')}</Text>
          <Text style={text.body}>{c.message}</Text>
        </View>
      ) : null}
      {error ? <InlineMessage message={error} /> : null}
      {c.status === 'pending' && !mine ? (
        <Row>
          <Button
            title={t('conn.accept')}
            small
            loading={decide.isPending}
            onPress={() => run(() => decide.mutateAsync({ id: c.id, status: 'accepted' }))}
          />
          <Button
            title={t('conn.decline')}
            variant="danger"
            small
            disabled={decide.isPending}
            onPress={async () => {
              if (!(await confirm(t('conn.confirmDecline'), { ok: t('conn.decline'), cancel: t('common.cancel') }))) return;
              run(() => decide.mutateAsync({ id: c.id, status: 'declined' }));
            }}
          />
        </Row>
      ) : c.status === 'pending' ? (
        <Row>
          <Text style={[text.muted, { flex: 1 }]}>{t('conn.pendingSent')}</Text>
          <Button
            title={t('conn.withdraw')}
            variant="danger"
            small
            loading={withdraw.isPending}
            onPress={async () => {
              if (!(await confirm(t('conn.confirmWithdraw'), { ok: t('conn.withdraw'), cancel: t('common.cancel') }))) return;
              run(() => withdraw.mutateAsync(c.id));
            }}
          />
        </Row>
      ) : c.status === 'accepted' && otherPhone ? (
        <PhoneLink phone={otherPhone} />
      ) : c.status === 'declined' ? (
        <Text style={text.muted}>{t('conn.declinedHint')}</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  item: { marginBottom: spacing.md, gap: spacing.sm },
  message: {
    backgroundColor: colors.bgAlt,
    borderRadius: radius,
    padding: spacing.sm + 4,
  },
});
