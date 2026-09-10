import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useDecideConnection, useMe, useMyConnections, useWithdrawConnection } from '@/api/hooks';
import type { Connection, Role } from '@/api/types';
import { CustomerCard, PhoneLink, WorkerCard } from '@/components/cards';
import { confirm } from '@/components/notify';
import { Button, EmptyState, ErrorView, InlineMessage, Loading, Row, Screen, Section } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatRelative } from '@/lib/time';
import { colors, radius, spacing, text } from '@/theme';

export function ConnectionsScreen() {
  const { t } = useI18n();
  const me = useMe();
  const conns = useMyConnections();
  const role = me.data?.role ?? 'worker';

  if (conns.isPending || !me.data) return <Loading />;
  if (conns.isError) return <ErrorView message={conns.error.message} onRetry={() => conns.refetch()} />;

  const all = conns.data;
  const myId = me.data.id;
  const received = all.filter((c) => c.status === 'pending' && c.initiated_by !== role);
  const sent = all.filter((c) => c.status === 'pending' && c.initiated_by === role);
  const declined = all.filter((c) => c.status === 'declined');
  // Chats: accepted connections, most recent activity first.
  const chats = all
    .filter((c) => c.status === 'accepted')
    .sort((a, b) => (b.last_message?.created_at ?? b.created_at).localeCompare(a.last_message?.created_at ?? a.created_at));

  return (
    <Screen title={t('conn.title')}>
      {all.length === 0 ? <EmptyState message={t('conn.empty')} /> : null}
      {chats.length ? (
        <Section title={t('conn.chats')}>
          {chats.map((c) => <ChatRow key={c.id} c={c} role={role} myId={myId} />)}
        </Section>
      ) : null}
      {received.length ? (
        <Section title={t('conn.received')}>
          {received.map((c) => <ConnectionItem key={c.id} c={c} role={role} />)}
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

/** One accepted connection as a chat list row: name, last message preview, relative time, unread badge. */
function ChatRow({ c, role, myId }: { c: Connection; role: Role; myId: string }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const other = role === 'worker' ? c.customer : c.worker;
  const name = other?.display_name ?? (role === 'worker' ? t('role.customer') : t('role.worker'));
  const last = c.last_message;
  const unread = c.unread_count ?? 0;
  const preview = last ? `${last.sender_id === myId ? `${t('conn.you')}: ` : ''}${last.body}` : t('conn.noMessagesYet');
  const when = formatRelative(last?.created_at ?? c.created_at, lang, t);
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const openChat = () => {
    if (role === 'worker') router.push({ pathname: '/(worker)/chat/[id]', params: { id: c.id } });
    else router.push({ pathname: '/(customer)/chat/[id]', params: { id: c.id } });
  };
  return (
    <Pressable
      onPress={openChat}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${preview}`}
      style={({ pressed }) => [s.chatRow, pressed && { backgroundColor: colors.bgAlt }]}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initial}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.chatTop}>
          <Text style={[text.h3, { flex: 1 }, unread > 0 && { fontWeight: '700' }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[text.small, unread > 0 && { color: colors.accent, fontWeight: '600' }]}>{when}</Text>
        </View>
        <View style={s.chatTop}>
          <Text style={[text.muted, { flex: 1 }, unread > 0 && { color: colors.text }]} numberOfLines={1}>
            {preview}
          </Text>
          {unread > 0 ? (
            <View style={s.unread} accessibilityLabel={`${unread}`}>
              <Text style={s.unreadText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
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
  const openChat = () => {
    if (role === 'worker') router.push({ pathname: '/(worker)/chat/[id]', params: { id: c.id } });
    else router.push({ pathname: '/(customer)/chat/[id]', params: { id: c.id } });
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
            onPress={() =>
              run(async () => {
                await decide.mutateAsync({ id: c.id, status: 'accepted' });
                openChat();
              })
            }
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
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accent, fontSize: 18, fontWeight: '700' },
  chatTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unread: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: colors.accentText, fontSize: 12, fontWeight: '700' },
  message: {
    backgroundColor: colors.bgAlt,
    borderRadius: radius,
    padding: spacing.sm + 4,
  },
});
