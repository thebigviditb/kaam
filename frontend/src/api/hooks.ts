import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { api } from './api';
import type {
  ChatMessage,
  Connection,
  ConnectionCreate,
  ConnectionDecision,
  CustomerFilters,
  CustomerProfileIn,
  FeedbackCreate,
  MediaRegister,
  ReportCreate,
  UserCreate,
  UserUpdate,
  WorkerFilters,
  WorkerProfileIn,
} from './types';
import { useAuth } from '@/auth/AuthContext';
import { useI18n, type Language } from '@/i18n';
import { pendingRef } from '@/lib/referral';

export const keys = {
  meta: ['meta'] as const,
  me: ['me'] as const,
  workerProfile: ['workers', 'me'] as const,
  customerProfile: ['customers', 'me'] as const,
  workers: (f: WorkerFilters) => ['workers', 'list', f] as const,
  matchingWorkers: ['workers', 'matching'] as const,
  worker: (id: string) => ['workers', id] as const,
  customers: (f: CustomerFilters) => ['customers', 'list', f] as const,
  matchingCustomers: ['customers', 'matching'] as const,
  customer: (id: string) => ['customers', id] as const,
  media: ['media'] as const,
  /** Prefix for every connection-related query (list + chats); use for invalidation. */
  connections: ['connections'] as const,
  /** The connections list. Keyed by UI language because `last_message.translated_body` depends on it. */
  connectionsList: (lang: Language) => ['connections', 'me', lang] as const,
  /** One chat. Keyed by UI language because `translated_body` depends on it. */
  messages: (connectionId: string, lang: Language) => ['connections', connectionId, 'messages', lang] as const,
};

function useSignedIn() {
  return useAuth().status === 'signedIn';
}

export function useMeta() {
  return useQuery({ queryKey: keys.meta, queryFn: api.getMeta, staleTime: Infinity });
}

export function useMe() {
  const enabled = useSignedIn();
  return useQuery({ queryKey: keys.me, queryFn: api.getMe, enabled, retry: false });
}

export function useCreateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UserCreate) => {
      const ref = await pendingRef.get();
      return api.createMe(ref ? { ...body, ref } : body);
    },
    onSuccess: (user) => {
      qc.setQueryData(keys.me, user);
      pendingRef.clear();
    },
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UserUpdate) => api.updateMe(body),
    onSuccess: (user, body) => {
      qc.setQueryData(keys.me, user);
      // The Hinglish choice changes which messages come back with `translated_body`,
      // so chats and connection previews must be refetched.
      if (body.hinglish_display !== undefined) qc.invalidateQueries({ queryKey: keys.connections });
    },
  });
}

export function useDeleteMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteMe(),
    onSuccess: (user) => qc.setQueryData(keys.me, user),
  });
}

export function useRestoreMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.restoreMe(),
    onSuccess: (user) => {
      qc.setQueryData(keys.me, user);
      // The profile is visible again; everything derived from it (profiles, matches) is stale.
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    },
  });
}

// ---- worker profile ----

export function useMyWorkerProfile({ enabled = true } = {}) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: keys.workerProfile,
    queryFn: api.getMyWorkerProfile,
    enabled: signedIn && enabled,
    retry: false,
  });
}

export function useUpsertWorkerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WorkerProfileIn) => api.upsertMyWorkerProfile(body),
    onSuccess: (p) => {
      qc.setQueryData(keys.workerProfile, p);
      qc.invalidateQueries({ queryKey: keys.me });
      qc.invalidateQueries({ queryKey: keys.matchingCustomers });
    },
  });
}

export function useWorkers(filters: WorkerFilters) {
  return useQuery({ queryKey: keys.workers(filters), queryFn: () => api.listWorkers(filters) });
}

export function useMatchingWorkers() {
  return useQuery({ queryKey: keys.matchingWorkers, queryFn: api.matchingWorkers, retry: false });
}

export function useWorker(id: string | undefined) {
  return useQuery({
    queryKey: keys.worker(id ?? ''),
    queryFn: () => api.getWorker(id as string),
    enabled: Boolean(id),
  });
}

// ---- customer profile ----

export function useMyCustomerProfile({ enabled = true } = {}) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: keys.customerProfile,
    queryFn: api.getMyCustomerProfile,
    enabled: signedIn && enabled,
    retry: false,
  });
}

export function useUpsertCustomerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CustomerProfileIn) => api.upsertMyCustomerProfile(body),
    onSuccess: (p) => {
      qc.setQueryData(keys.customerProfile, p);
      qc.invalidateQueries({ queryKey: keys.me });
      qc.invalidateQueries({ queryKey: keys.matchingWorkers });
    },
  });
}

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: keys.customers(filters),
    queryFn: () => api.listCustomers(filters),
  });
}

export function useMatchingCustomers() {
  return useQuery({
    queryKey: keys.matchingCustomers,
    queryFn: api.matchingCustomers,
    retry: false,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: keys.customer(id ?? ''),
    queryFn: () => api.getCustomer(id as string),
    enabled: Boolean(id),
  });
}

// ---- media ----

export function useMyMedia() {
  const enabled = useSignedIn();
  return useQuery({ queryKey: keys.media, queryFn: api.listMyMedia, enabled });
}

export function useRegisterMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MediaRegister) => api.registerMedia(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.media });
      qc.invalidateQueries({ queryKey: keys.workerProfile });
      qc.invalidateQueries({ queryKey: keys.customerProfile });
    },
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteMedia(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.media });
      qc.invalidateQueries({ queryKey: keys.workerProfile });
      qc.invalidateQueries({ queryKey: keys.customerProfile });
    },
  });
}

// ---- connections ----

function useInvalidateConnectionViews() {
  const qc = useQueryClient();
  // Every profile response embeds the viewer's connection state, so refresh them all.
  return () => {
    qc.invalidateQueries({ queryKey: keys.connections });
    qc.invalidateQueries({ queryKey: ['workers'] });
    qc.invalidateQueries({ queryKey: ['customers'] });
  };
}

/**
 * Refetches connection lists and chats when the UI language changes, so
 * server-side translations follow the language the user is reading in.
 * Mount once (root layout).
 */
export function useRefreshTranslationsOnLangChange() {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const prev = useRef(lang);
  useEffect(() => {
    if (prev.current === lang) return;
    prev.current = lang;
    qc.invalidateQueries({ queryKey: keys.connections });
  }, [lang, qc]);
}

/** Polled every 15 s (and on focus) so unread badges and chat previews stay fresh without websockets. */
export function useMyConnections() {
  const enabled = useSignedIn();
  const { lang } = useI18n();
  return useQuery({
    queryKey: keys.connectionsList(lang),
    queryFn: () => api.myConnections(lang),
    enabled,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });
}

/** Sum of unread messages across accepted connections (for the Connections tab badge). */
export function useUnreadTotal(): number {
  const conns = useMyConnections();
  return (conns.data ?? []).reduce((n, c) => n + (c.status === 'accepted' ? c.unread_count ?? 0 : 0), 0);
}

export function useCreateConnection() {
  const invalidate = useInvalidateConnectionViews();
  return useMutation({
    mutationFn: (body: ConnectionCreate) => api.createConnection(body),
    onSuccess: invalidate,
  });
}

export function useDecideConnection() {
  const invalidate = useInvalidateConnectionViews();
  return useMutation({
    mutationFn: ({ id, status }: { id: string } & ConnectionDecision) =>
      api.decideConnection(id, { status }),
    onSuccess: invalidate,
  });
}

export function useWithdrawConnection() {
  const invalidate = useInvalidateConnectionViews();
  return useMutation({
    mutationFn: (id: string) => api.withdrawConnection(id),
    onSuccess: invalidate,
  });
}

// ---- chat ----

function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return existing;
  const seen = new Set(existing.map((m) => m.id));
  const fresh = incoming.filter((m) => !seen.has(m.id));
  if (fresh.length === 0) return existing;
  return [...existing, ...fresh].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * Messages for one accepted connection, oldest→newest. The first load fetches
 * everything; afterwards a 3 s poll asks only for messages after the last known
 * id and appends them. Optimistic sends land in the same cache.
 */
export function useMessages(connectionId: string | undefined, { enabled = true } = {}) {
  const qc = useQueryClient();
  const signedIn = useSignedIn();
  const { lang } = useI18n();
  const key = keys.messages(connectionId ?? '', lang);
  const on = signedIn && enabled && Boolean(connectionId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => api.listMessages(connectionId as string, { lang }),
    enabled: on,
    staleTime: Infinity,
    retry: false,
  });

  const loaded = query.isSuccess;
  useEffect(() => {
    if (!on || !loaded) return;
    let cancelled = false;
    const tick = async () => {
      const cur = qc.getQueryData<ChatMessage[]>(key) ?? [];
      const last = [...cur].reverse().find((m) => !m.id.startsWith('tmp-'));
      try {
        const next = await api.listMessages(connectionId as string, { after: last?.id, lang });
        if (cancelled || next.length === 0) return;
        qc.setQueryData<ChatMessage[]>(key, (old) => mergeMessages(old ?? [], next));
      } catch {
        // transient; the next tick retries
      }
    };
    const id = setInterval(tick, 3_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, loaded, connectionId, lang, qc]);

  return query;
}

export function useSendMessage(connectionId: string, myUserId: string) {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const key = keys.messages(connectionId, lang);
  return useMutation({
    mutationFn: (body: string) => api.sendMessage(connectionId, { body }),
    onMutate: async (body) => {
      const tmp: ChatMessage = {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        connection_id: connectionId,
        sender_id: myUserId,
        body,
        created_at: new Date().toISOString(),
        lang: null,
        translated_body: null,
      };
      qc.setQueryData<ChatMessage[]>(key, (old) => [...(old ?? []), tmp]);
      return { tmpId: tmp.id };
    },
    onSuccess: (msg, _body, ctx) => {
      qc.setQueryData<ChatMessage[]>(key, (old) => {
        const rest = (old ?? []).filter((m) => m.id !== ctx?.tmpId && m.id !== msg.id);
        return mergeMessages(rest, [msg]);
      });
      qc.setQueryData<Connection[]>(keys.connectionsList(lang), (old) =>
        old?.map((c) =>
          c.id === connectionId
            ? {
                ...c,
                last_message: {
                  id: msg.id,
                  sender_id: msg.sender_id,
                  body: msg.body,
                  created_at: msg.created_at,
                  lang: msg.lang,
                  translated_body: msg.translated_body,
                },
              }
            : c,
        ),
      );
    },
    onError: (_e, _body, ctx) => {
      qc.setQueryData<ChatMessage[]>(key, (old) => (old ?? []).filter((m) => m.id !== ctx?.tmpId));
    },
  });
}

/** Marks a chat read on the server and zeroes the local unread count immediately. */
export function useMarkRead(connectionId: string) {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const inFlight = useRef(false);
  return useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    qc.setQueryData<Connection[]>(keys.connectionsList(lang), (old) =>
      old?.map((c) => (c.id === connectionId ? { ...c, unread_count: 0 } : c)),
    );
    try {
      await api.markRead(connectionId);
    } catch {
      // best-effort
    } finally {
      inFlight.current = false;
    }
  }, [qc, connectionId, lang]);
}

// ---- reports ----

export function useCreateReport() {
  return useMutation({ mutationFn: (body: ReportCreate) => api.createReport(body) });
}

// ---- feedback ----

export function useSendFeedback() {
  return useMutation({ mutationFn: (body: FeedbackCreate) => api.sendFeedback(body) });
}
