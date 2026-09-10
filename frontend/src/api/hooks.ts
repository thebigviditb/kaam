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
  MediaRegister,
  ReportCreate,
  UserCreate,
  UserUpdate,
  WorkerFilters,
  WorkerProfileIn,
} from './types';
import { useAuth } from '@/auth/AuthContext';

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
  connections: ['connections'] as const,
  messages: (connectionId: string) => ['connections', connectionId, 'messages'] as const,
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
    mutationFn: (body: UserCreate) => api.createMe(body),
    onSuccess: (user) => qc.setQueryData(keys.me, user),
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UserUpdate) => api.updateMe(body),
    onSuccess: (user) => qc.setQueryData(keys.me, user),
  });
}

// ---- worker profile ----

export function useMyWorkerProfile() {
  const enabled = useSignedIn();
  return useQuery({
    queryKey: keys.workerProfile,
    queryFn: api.getMyWorkerProfile,
    enabled,
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

export function useMyCustomerProfile() {
  const enabled = useSignedIn();
  return useQuery({
    queryKey: keys.customerProfile,
    queryFn: api.getMyCustomerProfile,
    enabled,
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

/** Polled every 15 s (and on focus) so unread badges and chat previews stay fresh without websockets. */
export function useMyConnections() {
  const enabled = useSignedIn();
  return useQuery({
    queryKey: keys.connections,
    queryFn: api.myConnections,
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
  const key = keys.messages(connectionId ?? '');
  const on = signedIn && enabled && Boolean(connectionId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => api.listMessages(connectionId as string),
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
        const next = await api.listMessages(connectionId as string, last?.id);
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
  }, [on, loaded, connectionId, qc]);

  return query;
}

export function useSendMessage(connectionId: string, myUserId: string) {
  const qc = useQueryClient();
  const key = keys.messages(connectionId);
  return useMutation({
    mutationFn: (body: string) => api.sendMessage(connectionId, { body }),
    onMutate: async (body) => {
      const tmp: ChatMessage = {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        connection_id: connectionId,
        sender_id: myUserId,
        body,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<ChatMessage[]>(key, (old) => [...(old ?? []), tmp]);
      return { tmpId: tmp.id };
    },
    onSuccess: (msg, _body, ctx) => {
      qc.setQueryData<ChatMessage[]>(key, (old) => {
        const rest = (old ?? []).filter((m) => m.id !== ctx?.tmpId && m.id !== msg.id);
        return mergeMessages(rest, [msg]);
      });
      qc.setQueryData<Connection[]>(keys.connections, (old) =>
        old?.map((c) =>
          c.id === connectionId
            ? { ...c, last_message: { id: msg.id, sender_id: msg.sender_id, body: msg.body, created_at: msg.created_at } }
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
  const inFlight = useRef(false);
  return useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    qc.setQueryData<Connection[]>(keys.connections, (old) =>
      old?.map((c) => (c.id === connectionId ? { ...c, unread_count: 0 } : c)),
    );
    try {
      await api.markRead(connectionId);
    } catch {
      // best-effort
    } finally {
      inFlight.current = false;
    }
  }, [qc, connectionId]);
}

// ---- reports ----

export function useCreateReport() {
  return useMutation({ mutationFn: (body: ReportCreate) => api.createReport(body) });
}
