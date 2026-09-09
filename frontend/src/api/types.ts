// Mirrors backend/app/schemas.py

export type Role = 'worker' | 'customer';
export type Language = 'en' | 'hi';
export type PayType = 'hourly' | 'daily' | 'monthly' | 'one_time';
export type JobStatus = 'open' | 'filled' | 'closed';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';
export type MediaKind = 'image' | 'video';

export type User = {
  id: string;
  role: Role;
  email: string | null;
  phone: string | null;
  preferred_language: Language;
  created_at: string;
};

export type UserCreate = {
  role: Role;
  phone?: string | null;
  preferred_language?: Language;
};

export type UserUpdate = {
  phone?: string | null;
  preferred_language?: Language;
};

export type Media = {
  id: string;
  kind: MediaKind;
  content_type: string;
  url: string;
  created_at: string;
};

export type PresignRequest = {
  kind: MediaKind;
  content_type: string;
  size_bytes: number;
};

export type PresignResponse = {
  upload_url: string;
  s3_key: string;
  headers: Record<string, string>;
};

export type MediaRegister = {
  kind: MediaKind;
  s3_key: string;
  content_type: string;
};

export type WorkerProfileIn = {
  display_name: string;
  bio: string;
  tags: string[];
  other_tag_text: string | null;
  years_experience: number;
  hourly_rate: number | null;
  city: string;
  availability: string;
  is_visible: boolean;
};

export type WorkerProfile = WorkerProfileIn & {
  user_id: string;
  updated_at: string;
  media: Media[];
  phone: string | null;
};

export type CustomerProfileIn = {
  display_name: string;
  city: string;
};

export type CustomerProfile = CustomerProfileIn & { user_id: string };

export type JobIn = {
  title: string;
  tags: string[];
  other_tag_text: string | null;
  description: string;
  pay_amount: number;
  pay_type: PayType;
  city: string;
  schedule: string;
};

export type JobUpdate = Partial<JobIn> & { status?: JobStatus };

export type Job = JobIn & {
  id: string;
  customer_id: string;
  customer_name: string;
  status: JobStatus;
  created_at: string;
  application_count: number;
  my_application_status: ApplicationStatus | null;
};

export type Application = {
  id: string;
  job_id: string;
  worker_id: string;
  message: string;
  status: ApplicationStatus;
  created_at: string;
  job: Job | null;
  worker: WorkerProfile | null;
};

export type Meta = {
  tags: string[];
  cities: string[];
  pay_types: PayType[];
};

export type JobFilters = {
  tags?: string[];
  city?: string;
  min_pay?: number;
  pay_type?: PayType;
  q?: string;
  status?: JobStatus | 'all';
};

export type WorkerFilters = {
  tags?: string[];
  city?: string;
  max_rate?: number;
  min_experience?: number;
  q?: string;
};
