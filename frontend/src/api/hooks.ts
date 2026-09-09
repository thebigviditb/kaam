import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './api';
import type {
  ApplicationStatus,
  CustomerProfileIn,
  JobFilters,
  JobIn,
  JobUpdate,
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
  worker: (id: string) => ['workers', id] as const,
  media: ['media'] as const,
  jobs: (f: JobFilters) => ['jobs', 'list', f] as const,
  matchingJobs: ['jobs', 'matching'] as const,
  myJobs: ['jobs', 'mine'] as const,
  job: (id: string) => ['jobs', id] as const,
  jobApplications: (id: string) => ['jobs', id, 'applications'] as const,
  myApplications: ['applications', 'me'] as const,
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
      qc.invalidateQueries({ queryKey: keys.matchingJobs });
    },
  });
}

export function useWorkers(filters: WorkerFilters) {
  return useQuery({ queryKey: keys.workers(filters), queryFn: () => api.listWorkers(filters) });
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
      qc.invalidateQueries({ queryKey: keys.myJobs });
    },
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

// ---- jobs ----

export function useJobs(filters: JobFilters, enabled = true) {
  return useQuery({ queryKey: keys.jobs(filters), queryFn: () => api.listJobs(filters), enabled });
}

export function useMatchingJobs(enabled = true) {
  return useQuery({ queryKey: keys.matchingJobs, queryFn: api.matchingJobs, enabled, retry: false });
}

export function useMyJobs() {
  return useQuery({ queryKey: keys.myJobs, queryFn: api.myJobs });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: keys.job(id ?? ''),
    queryFn: () => api.getJob(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: JobIn) => api.createJob(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.myJobs });
      qc.invalidateQueries({ queryKey: ['jobs', 'list'] });
    },
  });
}

export function useUpdateJob(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: JobUpdate) => api.updateJob(id, body),
    onSuccess: (job) => {
      qc.setQueryData(keys.job(id), job);
      qc.invalidateQueries({ queryKey: keys.myJobs });
      qc.invalidateQueries({ queryKey: ['jobs', 'list'] });
    },
  });
}

// ---- applications ----

export function useApply(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => api.apply(jobId, message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.job(jobId) });
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: keys.myApplications });
    },
  });
}

export function useJobApplications(jobId: string | undefined) {
  return useQuery({
    queryKey: keys.jobApplications(jobId ?? ''),
    queryFn: () => api.jobApplications(jobId as string),
    enabled: Boolean(jobId),
  });
}

export function useMyApplications() {
  return useQuery({ queryKey: keys.myApplications, queryFn: api.myApplications });
}

export function useDecideApplication(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Exclude<ApplicationStatus, 'pending'> }) =>
      api.decideApplication(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.jobApplications(jobId) });
      qc.invalidateQueries({ queryKey: keys.job(jobId) });
      qc.invalidateQueries({ queryKey: keys.myJobs });
    },
  });
}
