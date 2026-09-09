# Kaam — Architecture

Kaam is a marketplace connecting domestic workers (cooks, cleaners, nannies, etc.)
in the Bay Area with households that need help. Workers find work through the
website now, and later by phoning a number and talking to a Hindi-speaking AI agent.
Customers post job requests on the website.

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
- **Screens (v1):**
  - Sign up (pick Worker or Customer) / log in / verify email code
  - Worker: profile (tags, experience, rate, city, bio, photos/videos), browse jobs
    with filters (tags, city, pay, pay type), apply, my applications
  - Customer: post job (tags + "Other", pay, description, city, schedule), my jobs
    and their applicants (accept/reject), browse worker profiles with the same filters
  - Settings: language, log out

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
| users            | id, cognito_sub, role (worker/customer), email, phone, preferred_language |
| worker_profiles  | user_id, display_name, bio, tags[], other_tag_text, years_experience, hourly_rate, city, availability, is_visible |
| customer_profiles| user_id, display_name, city |
| jobs             | id, customer_id, title, tags[], other_tag_text, description, pay_amount, pay_type (hourly/daily/monthly/one_time), city, schedule, status (open/filled/closed) |
| applications     | id, job_id, worker_id, message, status (pending/accepted/rejected) |
| media            | id, owner_user_id, kind (image/video), s3_key, content_type |

**Tags (shared by jobs and worker profiles):** cooking, cleaning, laundry, dusting,
dishes, ironing, childcare, elder_care, grocery, other.

**City:** a fixed Bay Area list so filtering works without geocoding.

### Endpoints (v1)

```
GET  /me                    PUT /me            (role/phone/language on first login)
GET/PUT /workers/me         GET /workers?tags=&city=&max_rate=     GET /workers/{id}
POST /media/presign         POST /media        DELETE /media/{id}
POST /jobs   GET /jobs?tags=&city=&min_pay=&pay_type=   GET /jobs/{id}   PATCH /jobs/{id}
POST /jobs/{id}/apply       GET /jobs/{id}/applications   PATCH /applications/{id}
GET  /applications/me       GET /jobs/matching  (jobs matching my worker tags/city)
```

## 5. Infrastructure (AWS CDK, Python)

`KaamStack` deployed as `kaam-staging` and `kaam-prod` in us-west-2:

- Cognito user pool (email sign-in, email verification, self sign-up) + app client
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
- Audio streaming → Hindi STT → Claude with tools (`find_jobs_for_me`, `get_job`,
  `apply_to_job`, `update_my_availability`) → Hindi TTS. Candidates for Hindi
  STT/TTS: Sarvam AI, Google, ElevenLabs. A managed voice-agent platform (Vapi /
  Retell) is the fastest first version; it calls the same REST endpoints.
- SMS via Twilio for "new job matches your profile" alerts.

## 8. Out of scope for v1

Payments/escrow, background checks, ratings, real-time chat, app store builds.
