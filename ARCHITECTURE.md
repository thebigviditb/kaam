# Kaam — Architecture

Kaam is a marketplace connecting domestic workers (cooks, cleaners, nannies, etc.)
in the Bay Area with households that need help. Workers can find work through a
website now, and later by simply phoning a number and talking to a Hindi-speaking
AI agent. Customers post job requests on the website.

## 1. Repo layout (monorepo)

```
kaam/
  frontend/      Expo (React Native) app, web target first, iOS/Android later
  backend/       FastAPI (Python 3.12), SQLAlchemy + Alembic, pytest
  infra/         AWS CDK (Python) — one stack per environment
  .github/
    workflows/   CI + path-filtered deploys
  ARCHITECTURE.md
```

One repo, path-filtered CI, so a frontend-only change never redeploys the API.

## 2. Frontend

- **Expo + Expo Router** (React Native). `expo export --platform web` produces a
  static bundle we host on S3 + CloudFront. The same code becomes native apps later.
- **Styling:** plain StyleSheet, minimalist. No UI kit to start.
- **State/data:** TanStack Query against the REST API. Auth token in
  SecureStore (native) / localStorage (web).
- **Screens (v1):**
  - Sign up / log in (choose Worker or Customer)
  - Worker: edit profile (tags, experience, rate, city, bio, photos/videos), browse
    jobs with filters (tags, city, pay, schedule), apply
  - Customer: post job (tags + "Other", pay, description, city, schedule), view my
    jobs and applicants, browse worker profiles with the same filters, contact
  - Hindi/English UI strings via i18n from day one (workers' side defaults to Hindi)

## 3. Backend

- **FastAPI** with SQLAlchemy 2 + Alembic migrations, managed by `uv`.
- **Auth:** email or phone number + password, JWT access tokens issued by our own
  backend. Phone number is required for workers — it is the identity the voice agent
  will use (caller ID lookup). Twilio Verify OTP login gets added with the phone phase.
- **Media:** clients upload directly to S3 via presigned URLs; the API only stores
  keys. CloudFront serves them. Server-side limits: images ≤10 MB, videos ≤60 s / 100 MB.
- **Hosting:** container on **AWS App Runner** (per environment). Reason: the voice
  phase needs long-lived WebSocket connections for audio streaming, which Lambda
  handles poorly. App Runner is ~$5/mo idle per env and auto-scales.
- **Database:** **Neon** serverless Postgres (free tier), one project per environment.
  Swap to RDS later if needed — nothing in the code depends on Neon.
- **API is voice-ready:** every action the voice agent will need (find jobs matching
  my profile, apply, get job details) is a plain REST endpoint, so any voice platform
  can call it as a tool.

### Data model

| Table            | Key fields |
|------------------|-----------|
| users            | id, role (worker/customer), email, phone, password_hash, preferred_language |
| worker_profiles  | user_id, display_name, bio, tags[], other_tag_text, years_experience, hourly_rate, city, availability, is_visible |
| customer_profiles| user_id, display_name, city |
| jobs             | id, customer_id, title, tags[], other_tag_text, description, pay_amount, pay_type (hourly/daily/monthly/one_time), city, schedule, status (open/filled/closed) |
| applications     | id, job_id, worker_id, message, status (pending/accepted/rejected), created_at |
| media            | id, owner_user_id, kind (image/video), s3_key, created_at |

**Tags (shared by jobs and worker profiles):** cooking, cleaning, laundry, dusting,
dishes, ironing, childcare, elder_care, grocery, other.

**City:** a fixed Bay Area list (San Jose, Fremont, Sunnyvale, Santa Clara, Milpitas,
Cupertino, Mountain View, Palo Alto, San Francisco, Oakland, Dublin, Pleasanton, …)
so filtering is reliable without geocoding.

### Endpoints (v1)

```
POST /auth/signup          POST /auth/login          GET  /me
GET/PUT /workers/me        GET /workers?tags=&city=&max_rate=
POST /media/presign        POST /media  (register uploaded key)   DELETE /media/{id}
POST /jobs   GET /jobs?tags=&city=&min_pay=&pay_type=   GET /jobs/{id}   PATCH /jobs/{id}
POST /jobs/{id}/apply      GET /jobs/{id}/applications   PATCH /applications/{id}
GET  /applications/me
```

## 4. Infrastructure (AWS CDK, Python)

One `KaamStack` instantiated twice: `kaam-staging`, `kaam-prod`.

- S3 bucket + CloudFront for the web app
- S3 bucket + CloudFront for user media (private bucket, presigned PUT)
- ECR repo + App Runner service for the API
- Secrets Manager: DATABASE_URL, JWT_SECRET (later: Twilio, LLM keys)
- Route 53 + ACM if you own a domain (`kaam.example.com`, `staging.kaam.example.com`)

## 5. Environments and CI/CD (GitHub Actions)

| Branch    | Environment | Trigger |
|-----------|-------------|---------|
| `staging` | staging     | push |
| `main`    | production  | push (merge from `staging`) |

Workflows:

- **ci.yml** — every PR/push: backend lint (ruff) + pytest, frontend typecheck + lint,
  `cdk synth`.
- **deploy-infra.yml** — on `infra/**` change: `cdk deploy` to the branch's env.
- **deploy-backend.yml** — on `backend/**` change: build image, push to ECR, roll
  App Runner, run `alembic upgrade head`.
- **deploy-frontend.yml** — on `frontend/**` change: `expo export`, sync to S3,
  invalidate CloudFront.

Deploys use GitHub OIDC → an AWS IAM role (no long-lived keys). Each workflow is
also manually triggerable (`workflow_dispatch`) for a full redeploy.

## 6. Voice + SMS phase (planned, not built yet)

- **Number:** Twilio phone number per environment. Incoming call → webhook to the API.
- **Identity:** caller ID looked up against `users.phone`. Unknown caller → agent
  offers to create a worker profile by voice (name, city, skills, experience).
- **Agent:** Twilio Media Streams (WebSocket audio) → Hindi STT → Claude with tools
  (`find_jobs_for_me`, `get_job`, `apply_to_job`, `update_my_availability`) → Hindi
  TTS → back to caller. Candidates for Hindi STT/TTS: Sarvam AI, Google, ElevenLabs.
  A managed voice-agent platform (Vapi / Retell) is the faster first version; both
  call the same REST tools.
- **SMS:** Twilio Messaging for "new job matching your profile" alerts and for
  customers to reach workers without exposing numbers (proxy numbers).
- **Customer side:** optional call-in too, but the website is primary.

## 7. Out of scope for v1

Payments/escrow, background checks, ratings (fields can be added later), real-time chat,
native app store builds.
