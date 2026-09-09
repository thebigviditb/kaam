import { isApiError, request } from './client';
import type {
  Application,
  ApplicationStatus,
  CustomerProfile,
  CustomerProfileIn,
  Job,
  JobFilters,
  JobIn,
  JobUpdate,
  Media,
  MediaRegister,
  Meta,
  PresignRequest,
  PresignResponse,
  User,
  UserCreate,
  UserUpdate,
  WorkerFilters,
  WorkerProfile,
  WorkerProfileIn,
} from './types';

async function nullOn404<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (isApiError(e, 404)) return null;
    throw e;
  }
}

export const api = {
  // meta
  getMeta: () => request<Meta>('GET', '/meta'),

  // me
  getMe: () => nullOn404(request<User>('GET', '/me')),
  createMe: (body: UserCreate) => request<User>('POST', '/me', { body }),
  updateMe: (body: UserUpdate) => request<User>('PUT', '/me', { body }),

  // worker profile
  getMyWorkerProfile: () => nullOn404(request<WorkerProfile>('GET', '/workers/me')),
  upsertMyWorkerProfile: (body: WorkerProfileIn) =>
    request<WorkerProfile>('PUT', '/workers/me', { body }),
  listWorkers: (filters: WorkerFilters = {}) =>
    request<WorkerProfile[]>('GET', '/workers', { query: filters }),
  getWorker: (userId: string) => request<WorkerProfile>('GET', `/workers/${userId}`),

  // customer profile
  getMyCustomerProfile: () => nullOn404(request<CustomerProfile>('GET', '/customers/me')),
  upsertMyCustomerProfile: (body: CustomerProfileIn) =>
    request<CustomerProfile>('PUT', '/customers/me', { body }),

  // media
  presignMedia: (body: PresignRequest) =>
    request<PresignResponse>('POST', '/media/presign', { body }),
  registerMedia: (body: MediaRegister) => request<Media>('POST', '/media', { body }),
  listMyMedia: () => request<Media[]>('GET', '/media'),
  deleteMedia: (id: string) => request<void>('DELETE', `/media/${id}`),

  // jobs
  createJob: (body: JobIn) => request<Job>('POST', '/jobs', { body }),
  listJobs: (filters: JobFilters = {}) => request<Job[]>('GET', '/jobs', { query: filters }),
  matchingJobs: () => request<Job[]>('GET', '/jobs/matching'),
  myJobs: () => request<Job[]>('GET', '/jobs/mine'),
  getJob: (id: string) => request<Job>('GET', `/jobs/${id}`),
  updateJob: (id: string, body: JobUpdate) => request<Job>('PATCH', `/jobs/${id}`, { body }),
  deleteJob: (id: string) => request<void>('DELETE', `/jobs/${id}`),

  // applications
  apply: (jobId: string, message: string) =>
    request<Application>('POST', `/jobs/${jobId}/apply`, { body: { message } }),
  jobApplications: (jobId: string) =>
    request<Application[]>('GET', `/jobs/${jobId}/applications`),
  myApplications: () => request<Application[]>('GET', '/applications/me'),
  decideApplication: (id: string, status: Exclude<ApplicationStatus, 'pending'>) =>
    request<Application>('PATCH', `/applications/${id}`, { body: { status } }),
};

/** Upload raw bytes to the presigned S3 URL. */
export async function uploadToPresignedUrl(
  presign: PresignResponse,
  blob: Blob,
): Promise<void> {
  const res = await fetch(presign.upload_url, {
    method: 'PUT',
    headers: presign.headers,
    body: blob,
  });
  if (!res.ok) throw new Error(`upload failed (${res.status})`);
}
