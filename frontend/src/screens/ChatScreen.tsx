import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isApiError } from '@/api/client';
import { useMarkRead, useMe, useMessages, useMyConnections, useSendMessage } from '@/api/hooks';
import type { ChatMessage, Connection, Role } from '@/api/types';
import { Back } from '@/components/Back';
import { ErrorView, InlineMessage, Loading } from '@/components/ui';
import { useI18n } from '@/i18n';
import { displayPhone } from '@/lib/phone';
import { formatDayLabel, formatTime, isSameDay, parseServerDate } from '@/lib/time';
import { colors, maxContentWidth, radius, spacing, text } from '@/theme';

const MAX_BODY = 2000;

/** One accepted connection's chat room. Route param `id` is the connection id. */
export function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const me = useMe();
  const conns = useMyConnections();

  const role: Role = me.data?.role ?? 'worker';
  const fallback = role === 'worker' ? '/(worker)/connections' : '/(customer)/connections';
  const conn = conns.data?.find((c) => c.id === id) ?? null;

  if (!me.data || (conns.isPending && !conn)) {
    return (
      <View style={s.screen}>
        <Loading />
      </View>
    );
  }
  if (conns.isError && !conn) {
    return (
      <View style={s.screen}>
        <View style={s.content}>
          <Back fallback={fallback} always />
          <ErrorView message={conns.error.message} onRetry={() => conns.refetch()} />
        </View>
      </View>
    );
  }
  if (!conn) {
    return (
      <View style={s.screen}>
        <View style={s.content}>
          <Back fallback={fallback} always />
          <ErrorView message={t('chat.notFound')} />
        </View>
      </View>
    );
  }
  return <ChatRoom conn={conn} role={role} myId={me.data.id} />;
}

function ChatRoom({ conn, role, myId }: { conn: Connection; role: Role; myId: string }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const accepted = conn.status === 'accepted';
  const other = role === 'worker' ? conn.customer : conn.worker;
  const otherName = other?.display_name ?? (role === 'worker' ? t('role.customer') : t('role.worker'));
  const otherId = role === 'worker' ? conn.customer_id : conn.worker_id;
  const phone = other?.phone ?? null;
  const fallback = role === 'worker' ? '/(worker)/connections' : '/(customer)/connections';

  const messages = useMessages(conn.id, { enabled: accepted });
  const send = useSendMessage(conn.id, myId);
  const markRead = useMarkRead(conn.id);

  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const data = messages.data;
  const list = useMemo(() => data ?? [], [data]);
  const count = list.length;
  const lastIncomingId = [...list].reverse().find((m) => m.sender_id !== myId)?.id ?? null;

  // Mark read on open and whenever a new incoming message lands while we're here.
  useEffect(() => {
    if (accepted) markRead();
  }, [accepted, lastIncomingId, markRead]);

  // Keep the newest message in view.
  useEffect(() => {
    const h = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: count > 1 }), 30);
    return () => clearTimeout(h);
  }, [count]);

  const openProfile = () => {
    if (role === 'worker') router.push({ pathname: '/(worker)/customers/[id]', params: { id: otherId } });
    else router.push({ pathname: '/(customer)/workers/[id]', params: { id: otherId } });
  };

  const submit = useCallback(() => {
    const body = draft.trim();
    if (!body || send.isPending) return;
    setSendError(null);
    setDraft('');
    send.mutate(body.slice(0, MAX_BODY), {
      onError: (e) => {
        setSendError(isApiError(e, 403) ? t('chat.notAccepted') : t('chat.sendFailed'));
        setDraft(body);
      },
    });
    inputRef.current?.focus();
  }, [draft, send, t]);

  const groups = useMemo(() => groupByDay(list), [list]);

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}>
      <View style={[s.content, { paddingTop: insets.top + spacing.sm }]}>
        <View style={s.header}>
          <Back fallback={fallback} always />
          <Pressable
            onPress={openProfile}
            accessibilityRole="button"
            accessibilityLabel={t('chat.viewProfile')}
            style={({ pressed }) => [s.headerName, pressed && { opacity: 0.7 }]}>
            <Text style={text.h2} numberOfLines={1}>
              {otherName}
            </Text>
            <Text style={text.small}>{t('chat.viewProfile')}</Text>
          </Pressable>
          {phone ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={t('common.call', { phone: displayPhone(phone) })}
              onPress={() => Linking.openURL(`tel:${phone}`)}
              style={s.phoneBtn}
              {...({ href: `tel:${phone}` } as object)}>
              <Ionicons name="call-outline" size={22} color={colors.success} />
            </Pressable>
          ) : null}
        </View>

        {!accepted ? (
          <View style={s.center}>
            <Text style={[text.muted, { textAlign: 'center' }]}>{t('chat.notAccepted')}</Text>
          </View>
        ) : messages.isPending ? (
          <Loading />
        ) : messages.isError ? (
          <ErrorView
            message={isApiError(messages.error, 403) ? t('chat.notAccepted') : messages.error.message}
            onRetry={() => messages.refetch()}
          />
        ) : (
          <ScrollView
            ref={scrollRef}
            style={s.list}
            contentContainerStyle={s.listContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
            {list.length === 0 ? (
              <View style={s.center}>
                <Text style={[text.muted, { textAlign: 'center' }]}>{t('chat.empty', { name: otherName })}</Text>
              </View>
            ) : (
              groups.map((g) => (
                <View key={g.key}>
                  <View style={s.dayRow}>
                    <Text style={s.dayLabel}>{formatDayLabel(g.date, lang, t)}</Text>
                  </View>
                  {g.items.map((m) => (
                    <Bubble key={m.id} m={m} mine={m.sender_id === myId} lang={lang} />
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        )}

        {sendError ? <InlineMessage message={sendError} /> : null}

        {accepted ? (
          <View style={[s.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.muted}
              multiline
              maxLength={MAX_BODY}
              blurOnSubmit={false}
              style={s.input}
              accessibilityLabel={t('chat.placeholder')}
              onKeyPress={(e) => {
                // Enter sends on web; Shift+Enter inserts a newline.
                if (Platform.OS !== 'web') return;
                const ke = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
                if (ke.key === 'Enter' && !ke.shiftKey) {
                  (e as unknown as { preventDefault?: () => void }).preventDefault?.();
                  submit();
                }
              }}
            />
            <Pressable
              onPress={submit}
              disabled={!draft.trim() || send.isPending}
              accessibilityRole="button"
              accessibilityLabel={t('chat.send')}
              style={({ pressed }) => [
                s.sendBtn,
                (!draft.trim() || send.isPending) && { opacity: 0.4 },
                pressed && { opacity: 0.8 },
              ]}>
              <Ionicons name="send" size={20} color={colors.accentText} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ m, mine, lang }: { m: ChatMessage; mine: boolean; lang: string }) {
  const pending = m.id.startsWith('tmp-');
  return (
    <View style={[s.bubbleRow, mine ? s.bubbleRowMine : s.bubbleRowTheirs]}>
      <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs, pending && { opacity: 0.6 }]}>
        <Text style={[s.bubbleText, mine && { color: colors.accentText }]}>{m.body}</Text>
        <Text style={[s.time, mine ? s.timeMine : s.timeTheirs]}>{formatTime(parseServerDate(m.created_at), lang)}</Text>
      </View>
    </View>
  );
}

function groupByDay(list: ChatMessage[]): { key: string; date: Date; items: ChatMessage[] }[] {
  const out: { key: string; date: Date; items: ChatMessage[] }[] = [];
  for (const m of list) {
    const d = parseServerDate(m.created_at);
    const last = out[out.length - 1];
    if (last && isSameDay(last.date, d)) last.items.push(m);
    else out.push({ key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${m.id}`, date: d, items: [m] });
  }
  return out;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerName: { flex: 1, minWidth: 0 },
  phoneBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successSoft,
  },
  list: { flex: 1 },
  listContent: { paddingVertical: spacing.md, flexGrow: 1, justifyContent: 'flex-end' },
  center: { flex: 1, paddingVertical: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  dayRow: { alignItems: 'center', marginVertical: spacing.sm },
  dayLabel: {
    fontSize: 12,
    color: colors.muted,
    backgroundColor: colors.bgAlt,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  bubbleRow: { flexDirection: 'row', marginVertical: 3 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21, color: colors.text },
  time: { fontSize: 11, marginTop: 3, alignSelf: 'flex-end' },
  timeMine: { color: 'rgba(255,255,255,0.8)' },
  timeTheirs: { color: colors.muted },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius + 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
