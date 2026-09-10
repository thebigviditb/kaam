import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './api';
import type {
  ConnectionCreate,
  ConnectionDecision,
  CustomerFilters,
  CustomerProfileIn,
  MediaRegister,
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

export function useMyConnections() {
  const enabled = useSignedIn();
  return useQuery({ queryKey: keys.connections, queryFn: api.myConnections, enabled });
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
