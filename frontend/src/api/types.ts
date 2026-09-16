// Mirrors backend/app/schemas.py

export type Role = 'worker' | 'customer';
export type Language = 'en' | 'hi';
/** Detected language of a chat message. 'hinglish' is Hindi written in Latin letters. */
export type MessageLang = 'en' | 'hi' | 'hinglish';
/** How an English-language reader wants Hinglish messages shown; null = never chosen. */
export type HinglishDisplay = 'original' | 'english';
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
  /** Stable 6–8 char code; `?ref=<code>` on the site URL credits this user for a sign-up. */
  referral_code: string;
  /** When set, the account is scheduled to be purged at this time (ISO datetime); POST /me/restore cancels. */
  deletion_scheduled_for: string | null;
  /** English readers only: show Hinglish messages translated ('english') or as written ('original'). */
  hinglish_display: HinglishDisplay | null;
};

export type UserCreate = {
  role: Role;
  phone: string;
  preferred_language?: Language;
  /** The inviter's referral code (from `?ref=`); unknown codes are ignored by the server. */
  ref?: string;
};

export type UserUpdate = {
  phone?: string;
  preferred_language?: Language;
  hinglish_display?: HinglishDisplay;
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
  /** Home city (one of /meta.cities). */
  city: string;
  /** Cities the worker is willing to work in (min 1, each from /meta.cities). */
  work_cities: string[];
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
  match_level: 'exact' | 'partial' | null;
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
  media: Media[];
  phone: string | null;
  connection: ConnectionSummary | null;
  match_score: number;
  match_level: 'exact' | 'partial' | null;
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
  /** Detected language of `body`; null when unknown. */
  lang: MessageLang | null;
  /** `body` rendered in the viewer's language; null when already in it (or translation failed). */
  translated_body: string | null;
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
  /** Detected language of `body`; null when unknown. */
  lang: MessageLang | null;
  /** `body` rendered in the viewer's language; null when already in it (or translation failed). */
  translated_body: string | null;
};

export type ChatMessageCreate = { body: string };

// ---- reports ----

export type ReportReason =
  | 'inappropriate_behavior'
  | 'harassment'
  | 'scam_or_fraud'
  | 'no_show'
  | 'fake_profile'
  | 'other';

/** Fallback order when /meta has not loaded; the server's `report_reasons` wins. */
export const REPORT_REASONS: ReportReason[] = [
  'inappropriate_behavior',
  'harassment',
  'scam_or_fraud',
  'no_show',
  'fake_profile',
  'other',
];

export type ReportCreate = {
  reported_user_id: string;
  connection_id?: string;
  reason: ReportReason;
  /** Max 2000 chars; required when reason is 'other'. */
  description?: string;
};

export type ReportOut = { id: string; created_at: string };

// ---- feedback ----

export type FeedbackCategory = 'bug' | 'idea' | 'other';
export const FEEDBACK_CATEGORIES: FeedbackCategory[] = ['bug', 'idea', 'other'];

export type FeedbackCreate = {
  /** 3..4000 chars. */
  message: string;
  category: FeedbackCategory;
  /** How to reach the sender (email/phone), max 120 chars. */
  contact?: string;
  /** Where the form was opened, e.g. 'settings'. */
  page?: string;
};

export type FeedbackOut = { id: string; created_at: string };

export type Meta = {
  tags: string[];
  cities: string[];
  pay_types: PayType[];
  days: Day[];
  times: TimeOfDay[];
  start_timings: StartTiming[];
  report_reasons: ReportReason[];
};

// ---- list filters (query strings) ----

export type WorkerFilters = {
  tags?: string[];
  /** Workers willing to work in this city (matches `work_cities`). */
  city?: string;
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
