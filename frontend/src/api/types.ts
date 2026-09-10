// Mirrors backend/app/schemas.py

export type Role = 'worker' | 'customer';
export type Language = 'en' | 'hi';
export type PayType = 'hourly' | 'daily' | 'monthly' | 'one_time';
export type StartTiming = 'asap' | 'within_2_weeks' | 'within_month' | 'flexible';
export type ConnectionStatus = 'pending' | 'accepted' | 'declined';
export type MediaKind = 'image' | 'video';
export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export const DAYS: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const TIMES: TimeOfDay[] = ['morning', 'afternoon', 'evening'];
export const START_TIMINGS: StartTiming[] = ['asap', 'within_2_weeks', 'within_month', 'flexible'];
export const PAY_TYPES: PayType[] = ['hourly', 'daily', 'monthly', 'one_time'];

// ---- users / me ----

export type User = {
  id: string;
  role: Role;
  email: string | null;
  phone: string | null;
  preferred_language: Language;
  created_at: string;
  onboarded: boolean;
};

export type UserCreate = {
  role: Role;
  phone: string;
  preferred_language?: Language;
};

export type UserUpdate = {
  phone?: string;
  preferred_language?: Language;
};

// ---- media ----

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

// ---- connection summary embedded in profiles ----

export type ConnectionSummary = {
  id: string;
  status: ConnectionStatus;
  initiated_by: Role;
};

// ---- worker profile ----

export type WorkerProfileIn = {
  display_name: string;
  bio: string;
  tags: string[];
  other_tag_text: string | null;
  years_experience: number;
  hourly_rate: number | null;
  days: string[];
  times: string[];
  is_visible: boolean;
};

export type WorkerProfile = WorkerProfileIn & {
  user_id: string;
  updated_at: string;
  media: Media[];
  phone: string | null;
  connection: ConnectionSummary | null;
  match_score: number;
};

// ---- customer profile (the household's need) ----

export type CustomerProfileIn = {
  display_name: string;
  city: string;
  tags: string[];
  other_tag_text: string | null;
  description: string;
  pay_amount: number | null;
  pay_type: PayType;
  start_timing: StartTiming;
  days: string[];
  times: string[];
  is_active: boolean;
};

export type CustomerProfile = CustomerProfileIn & {
  user_id: string;
  updated_at: string;
  phone: string | null;
  connection: ConnectionSummary | null;
  match_score: number;
};

// ---- connections ----

export type ConnectionCreate = {
  customer_id?: string;
  worker_id?: string;
  message: string;
};

export type ConnectionDecision = { status: 'accepted' | 'declined' };

export type LastMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type Connection = {
  id: string;
  customer_id: string;
  worker_id: string;
  initiated_by: Role;
  message: string;
  status: ConnectionStatus;
  created_at: string;
  worker: WorkerProfile | null;
  customer: CustomerProfile | null;
  last_message: LastMessage | null;
  unread_count: number;
};

// ---- chat ----

export type ChatMessage = {
  id: string;
  connection_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type ChatMessageCreate = { body: string };

export type Meta = {
  tags: string[];
  cities: string[];
  pay_types: PayType[];
  days: Day[];
  times: TimeOfDay[];
  start_timings: StartTiming[];
};

// ---- list filters (query strings) ----

export type WorkerFilters = {
  tags?: string[];
  days?: string[];
  times?: string[];
  max_rate?: number;
  min_experience?: number;
  q?: string;
};

export type CustomerFilters = {
  tags?: string[];
  days?: string[];
  times?: string[];
  city?: string;
  min_pay?: number;
  pay_type?: PayType;
  start_timing?: StartTiming;
  q?: string;
};
