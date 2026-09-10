# Kaam — Architecture

Kaam is a marketplace connecting domestic workers (cooks, cleaners, nannies, etc.)
in the Bay Area with households that need help. Both sides answer a short onboarding
questionnaire (what work, when, and for households, where and what pay), the app ranks
matches, and either side can reach out. Once the other side accepts, phone numbers are
shared. Later, workers will also be able to phone a number and talk to a Hindi-speaking
AI agent that reads them their matches.

## 1. Repo layout (monorepo)

```
kaam/
  frontend/      Expo (React Native) app, web target first, iOS/Android later
  backend/       FastAPI (Python 3.12), SQLAlchemy + Alembic, pytest
  infra/         AWS CDK (Python): Cognito user pool + S3 media bucket per env
  .github/
    workflows/   CI + path-filtered deploys
  ARCHITECTURE.md
```

## 2. Hosting: everything on Vercel except auth and media

| Piece        | Where                          | Why |
|--------------|--------------------------------|-----|
| Web app      | Vercel (static Expo web export)| zero config, free |
| API          | Vercel Python serverless (FastAPI) | same place as the web app, no servers |
| Database     | Neon Postgres                  | serverless Postgres, free tier, made for Vercel |
| Auth         | AWS Cognito user pool          | managed users, passwords, email verification, JWTs |
| Photos/videos| AWS S3 (private bucket, presigned uploads) | cheap, durable |

Vercel and Neon are two projects each: `staging` and `production`.
AWS is one CDK stack deployed twice: `kaam-staging` and `kaam-prod`.

When voice becomes a feature we add a long-running service (App Runner or similar)
for audio streaming. Nothing in the web app has to change for that.

## 3. Frontend

- **Expo + Expo Router** (React Native). `expo export --platform web` produces a
  static bundle deployed to Vercel. The same code becomes native apps later.
- **Styling:** plain StyleSheet, minimalist. No UI kit to start.
- **Data:** TanStack Query against the REST API. Cognito session handled by
  `aws-amplify` Auth (works on web and native).
- **Language:** i18n with English and Hindi. A **Settings** screen has a language
  picker; the choice is saved on the device and on the user record.
- **Auth is passwordless.** Workers sign up and log in with a phone number and a
  texted code. Households can use phone or email. No passwords anywhere.
- **Screens (v1):**
  - Welcome → pick Worker / Household → phone (or email) → code → registered
  - **Onboarding wizard**, one question per screen:
    - Household: name + city → what work (tags + Other) → when needed (asap / 2 weeks /
      month / flexible) → which days + time of day → expected pay + description
    - Worker: name + bio → what work → which days + time of day available →
      experience + rate → optional photos/videos. Workers have no location.
  - Tabs (both roles): **Matches** (ranked), **Browse** (filters), **Connections**
    (received / sent / accepted, with phone once accepted), **Profile** (edit the
    onboarding answers), **Settings**

## 4. Backend

- **FastAPI** with SQLAlchemy 2 + Alembic migrations, managed by `uv`.
  Deployed as a Vercel Python function (`backend/api/index.py` exposes `app`).
- **Auth:** the frontend signs in with Cognito and sends the Cognito access token as
  `Authorization: Bearer …`. The API verifies it against the pool's JWKS. On first
  request after sign-up the API creates a `users` row keyed by the Cognito `sub`.
  Phone number is required for workers — it will be the caller-ID identity for the
  voice agent.
- **Media:** clients upload directly to S3 via presigned PUT URLs; the API stores
  keys and hands out presigned GET URLs. Limits: images ≤10 MB, videos ≤100 MB.
- **Voice-ready:** every action the voice agent will need (find jobs matching my
  profile, apply, get job details) is a plain REST endpoint.

### Data model (Postgres)

| Table            | Key fields |
|------------------|-----------|
| users            | id, cognito_sub, role (worker/customer), email, phone (required), preferred_language |
| worker_profiles  | user_id, display_name, bio, tags[], other_tag_text, years_experience, hourly_rate, days[], times[], is_visible |
| customer_profiles| user_id, display_name, city, tags[], other_tag_text, description, pay_amount, pay_type, start_timing, days[], times[], is_active |
| connections      | id, customer_id, worker_id, initiated_by, message, status (pending/accepted/declined), *_last_read_at; unique per pair |
| messages         | id, connection_id, sender_id, body, created_at |
| media            | id, owner_user_id, kind (image/video), s3_key, content_type |

**Days:** mon…sun. **Times:** morning / afternoon / evening. **Start timing:** asap,
within_2_weeks, within_month, flexible. **Match score** = 10 × shared tags + 2 × shared
days + shared time slots; zero shared tags means no match.

**Tags (shared by jobs and worker profiles):** cooking, cleaning, laundry, dusting,
dishes, ironing, childcare, elder_care, grocery, other.

**City:** a fixed Bay Area list so filtering works without geocoding.

### Endpoints (v1)

```
GET /meta                   GET /me   POST /me (role, phone, language)   PUT /me
GET/PUT /workers/me         GET /workers?tags=&days=&times=&max_rate=&min_experience=&q=
GET /workers/matching       GET /workers/{id}
GET/PUT /customers/me       GET /customers?tags=&days=&times=&city=&min_pay=&pay_type=&start_timing=&q=
GET /customers/matching     GET /customers/{id}      ← the voice agent's "what work is there for me?"
POST /connections           GET /connections/me      PATCH /connections/{id}   DELETE /connections/{id}
GET/POST /connections/{id}/messages   POST /connections/{id}/read     (chat, accepted only; polled)
POST /media/presign         POST /media              DELETE /media/{id}
```

## 5. Infrastructure (AWS CDK, Python)

`KaamStack` deployed as `kaam-staging` and `kaam-prod` in us-west-2:

- Cognito user pool (ESSENTIALS plan, passwordless: SMS OTP + email OTP, phone/email
  sign-in aliases, self sign-up) + app client with the USER_AUTH flow
- Private S3 bucket for media with CORS for browser uploads
- IAM user with put/get on that bucket; its access key goes into Vercel env vars

Outputs (pool id, client id, bucket name) are what the frontend and API need.

## 6. Environments and CI/CD (GitHub Actions)

| Branch    | Environment | Vercel target | AWS stack     | Neon project   |
|-----------|-------------|---------------|---------------|----------------|
| `staging` | staging     | preview + alias `kaam-web-staging` / `kaam-api-staging` | kaam-staging | kaam-staging |
| `main`    | production  | production    | kaam-prod     | kaam-prod      |

Workflows (all path-filtered, all manually triggerable too):

- **ci.yml** — every PR/push: ruff + pytest, tsc + eslint, `cdk synth`.
- **deploy-infra.yml** — `infra/**` changed → `cdk deploy` (GitHub OIDC → AWS role).
- **deploy-backend.yml** — `backend/**` changed → `alembic upgrade head` against that
  env's Neon, then `vercel deploy`.
- **deploy-frontend.yml** — `frontend/**` changed → `vercel deploy`.

Secrets needed in GitHub: `AWS_ROLE_ARN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
`VERCEL_PROJECT_ID_WEB`, `VERCEL_PROJECT_ID_API`, `DATABASE_URL_STAGING`,
`DATABASE_URL_PROD`. See `docs/SETUP.md`.

## 7. Voice + SMS phase (planned, not built yet)

- Twilio phone number per environment. Incoming call → webhook to the API.
- Caller ID looked up against `users.phone`. Unknown caller → agent offers to create
  a worker profile by voice.
- Audio streaming → Hindi STT → Claude with tools (`my_matches` = GET /customers/matching,
  `reach_out` = POST /connections, `update_my_availability` = PUT /workers/me) → Hindi TTS. Candidates for Hindi
  STT/TTS: Sarvam AI, Google, ElevenLabs. A managed voice-agent platform (Vapi /
  Retell) is the fastest first version; it calls the same REST endpoints.
- SMS via Twilio for "new job matches your profile" alerts.

## 8. Out of scope for v1

Payments/escrow, background checks, ratings, real-time chat, app store builds.
