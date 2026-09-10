import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useCreateConnection, useDecideConnection, useWithdrawConnection } from '@/api/hooks';
import type { ConnectionSummary, Role } from '@/api/types';
import { PhoneLink } from '@/components/cards';
import { confirm } from '@/components/notify';
import { Button, Field, InlineMessage, Input, Row } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, radius, spacing, text } from '@/theme';

/**
 * The "reach out" box on a profile detail screen, or the current connection state
 * (pending / accepted with phone / declined) with the actions the viewer may take.
 */
export function ConnectionPanel({
  targetId,
  viewerRole,
  connection,
  phone,
}: {
  targetId: string;
  viewerRole: Role;
  connection: ConnectionSummary | null;
  phone: string | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const create = useCreateConnection();
  const decide = useDecideConnection();
  const withdraw = useWithdrawConnection();
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  const openChat = (id: string) => {
    if (viewerRole === 'worker') router.push({ pathname: '/(worker)/chat/[id]', params: { id } });
    else router.push({ pathname: '/(customer)/chat/[id]', params: { id } });
  };

  if (!connection) {
    return (
      <View style={s.box}>
        <Text style={[text.h3, { marginBottom: spacing.sm }]}>{t('conn.reachOut')}</Text>
        {error ? <InlineMessage message={error} /> : null}
        {sent ? <InlineMessage message={t('conn.sentOk')} tone="success" /> : null}
        <Field label={t('conn.message')} optional>
          <Input
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder={viewerRole === 'worker' ? t('conn.messageWorker') : t('conn.messageCustomer')}
          />
        </Field>
        <Button
          title={t('conn.send')}
          loading={create.isPending}
          onPress={() =>
            run(async () => {
              await create.mutateAsync(
                viewerRole === 'worker'
                  ? { customer_id: targetId, message: message.trim() }
                  : { worker_id: targetId, message: message.trim() },
              );
              setSent(true);
            })
          }
        />
        <Text style={[text.small, { marginTop: spacing.sm }]}>{t('conn.phoneAfterAccept')}</Text>
      </View>
    );
  }

  const mine = connection.initiated_by === viewerRole;

  if (connection.status === 'pending' && mine) {
    return (
      <View style={s.box}>
        {error ? <InlineMessage message={error} /> : null}
        <Text style={text.h3}>{t('conn.pendingSent')}</Text>
        <Text style={[text.small, { marginTop: spacing.xs, marginBottom: spacing.sm }]}>{t('conn.phoneAfterAccept')}</Text>
        <Button
          title={t('conn.withdraw')}
          variant="danger"
          small
          loading={withdraw.isPending}
          onPress={async () => {
            if (!(await confirm(t('conn.confirmWithdraw'), { ok: t('conn.withdraw'), cancel: t('common.cancel') }))) return;
            run(() => withdraw.mutateAsync(connection.id));
          }}
          style={{ alignSelf: 'flex-start' }}
        />
      </View>
    );
  }

  if (connection.status === 'pending') {
    return (
      <View style={s.box}>
        {error ? <InlineMessage message={error} /> : null}
        <Text style={[text.h3, { marginBottom: spacing.sm }]}>{t('conn.pendingReceived')}</Text>
        <Row>
          <Button
            title={t('conn.accept')}
            small
            loading={decide.isPending}
            onPress={() =>
              run(async () => {
                await decide.mutateAsync({ id: connection.id, status: 'accepted' });
                openChat(connection.id);
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
              run(() => decide.mutateAsync({ id: connection.id, status: 'declined' }));
            }}
          />
        </Row>
      </View>
    );
  }

  if (connection.status === 'accepted') {
    return (
      <View style={[s.box, { borderColor: colors.success, backgroundColor: colors.successSoft }]}>
        <Text style={[text.h3, { marginBottom: spacing.sm, color: colors.success }]}>{t('conn.acceptedHint')}</Text>
        <Row>
          <Button title={t('conn.openChat')} onPress={() => openChat(connection.id)} />
          {phone ? <PhoneLink phone={phone} /> : null}
        </Row>
      </View>
    );
  }

  return (
    <View style={s.box}>
      <Text style={text.muted}>{t('conn.declinedHint')}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.bgAlt,
  },
});
