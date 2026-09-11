import { isApiError, request } from './client';
import type {
  ChatMessage,
  ChatMessageCreate,
  Connection,
  ConnectionCreate,
  ConnectionDecision,
  CustomerFilters,
  CustomerProfile,
  CustomerProfileIn,
  Media,
  MediaRegister,
  Meta,
  PresignRequest,
  PresignResponse,
  ReportCreate,
  ReportOut,
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
  matchingWorkers: () => request<WorkerProfile[]>('GET', '/workers/matching'),
  getWorker: (userId: string) => request<WorkerProfile>('GET', `/workers/${userId}`),

  // customer profile (the need)
  getMyCustomerProfile: () => nullOn404(request<CustomerProfile>('GET', '/customers/me')),
  upsertMyCustomerProfile: (body: CustomerProfileIn) =>
    request<CustomerProfile>('PUT', '/customers/me', { body }),
  listCustomers: (filters: CustomerFilters = {}) =>
    request<CustomerProfile[]>('GET', '/customers', { query: filters }),
  matchingCustomers: () => request<CustomerProfile[]>('GET', '/customers/matching'),
  getCustomer: (userId: string) => request<CustomerProfile>('GET', `/customers/${userId}`),

  // media
  presignMedia: (body: PresignRequest) =>
    request<PresignResponse>('POST', '/media/presign', { body }),
  registerMedia: (body: MediaRegister) => request<Media>('POST', '/media', { body }),
  listMyMedia: () => request<Media[]>('GET', '/media'),
  deleteMedia: (id: string) => request<void>('DELETE', `/media/${id}`),

  // connections
  createConnection: (body: ConnectionCreate) =>
    request<Connection>('POST', '/connections', { body }),
  myConnections: () => request<Connection[]>('GET', '/connections/me'),
  decideConnection: (id: string, body: ConnectionDecision) =>
    request<Connection>('PATCH', `/connections/${id}`, { body }),
  withdrawConnection: (id: string) => request<void>('DELETE', `/connections/${id}`),

  // chat (accepted connections only)
  listMessages: (connectionId: string, after?: string, limit = 100) =>
    request<ChatMessage[]>('GET', `/connections/${connectionId}/messages`, {
      query: { after, limit },
    }),
  sendMessage: (connectionId: string, body: ChatMessageCreate) =>
    request<ChatMessage>('POST', `/connections/${connectionId}/messages`, { body }),
  markRead: (connectionId: string) => request<void>('POST', `/connections/${connectionId}/read`),

  // reports
  createReport: (body: ReportCreate) => request<ReportOut>('POST', '/reports', { body }),
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
