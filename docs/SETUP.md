# Kaam — one-time setup

Everything below is done once. After that, pushing to `staging` or `main` deploys.

## 1. AWS (Cognito + S3) — `cdk deploy`

From `infra/` with your AWS CLI logged in (region us-west-2):

```sh
cd infra && uv sync
npx -y aws-cdk@latest deploy kaam-github kaam-staging kaam-prod --require-approval never --outputs-file cdk.outputs.json
```

`cdk.outputs.json` now holds, per environment: `UserPoolId`, `UserPoolClientId`,
`MediaBucketName`, `ApiUserName`, and for `kaam-github`: `DeployRoleArn`.

Create an access key for each API user (the API on Vercel uses it to sign S3 URLs):

```sh
aws iam create-access-key --user-name kaam-staging-api
aws iam create-access-key --user-name kaam-prod-api
```

## 2. Neon (Postgres)

Create two projects at https://neon.tech: `kaam-staging` and `kaam-prod`.
Copy each connection string and change the scheme to `postgresql+psycopg://…`.

## 3. Vercel

Install the CLI and log in: `npm i -g vercel && vercel login`.

Create two projects (do **not** connect them to GitHub — GitHub Actions deploys):

```sh
cd frontend && vercel link   # name it kaam-web
cd ../backend && vercel link # name it kaam-api
```

`vercel link` writes `.vercel/project.json` containing `orgId` and `projectId`.

Set environment variables on each project (dashboard: Project → Settings →
Environment Variables, or `vercel env add NAME production|preview`). **Production**
is prod; **Preview** is staging — GitHub Actions is the only deployer, so every
preview deploy is a staging deploy.

**kaam-api**

| Variable | Value |
|---|---|
| DATABASE_URL | Neon URL for that env |
| COGNITO_REGION | us-west-2 |
| COGNITO_USER_POOL_ID | from cdk outputs |
| COGNITO_CLIENT_ID | from cdk outputs |
| MEDIA_BUCKET | from cdk outputs |
| MEDIA_AWS_ACCESS_KEY_ID / MEDIA_AWS_SECRET_ACCESS_KEY | from `create-access-key` (Vercel reserves the plain AWS_* names) |
| MEDIA_AWS_REGION | us-west-2 |
| CORS_ORIGINS | `https://kaam-web-tau.vercel.app` (prod) / `https://kaam-web-staging.vercel.app` (staging) |

**kaam-web**

| Variable | Value |
|---|---|
| EXPO_PUBLIC_API_URL | `https://kaam-api-neon.vercel.app` (prod) / `https://kaam-api-staging.vercel.app` (staging) |
| EXPO_PUBLIC_COGNITO_USER_POOL_ID | from cdk outputs |
| EXPO_PUBLIC_COGNITO_CLIENT_ID | from cdk outputs |

Create a Vercel token at https://vercel.com/account/tokens.

## 4. GitHub

Create two environments in the repo (Settings → Environments): `staging` and
`production`. Add these secrets to **each** environment:

| Secret | Value |
|---|---|
| AWS_ROLE_ARN | `DeployRoleArn` from the `kaam-github` stack (same for both) |
| VERCEL_TOKEN | the token you created |
| VERCEL_ORG_ID | `orgId` from `.vercel/project.json` |
| VERCEL_PROJECT_ID_WEB | `projectId` from `frontend/.vercel/project.json` |
| VERCEL_PROJECT_ID_API | `projectId` from `backend/.vercel/project.json` |
| DATABASE_URL | that environment's Neon URL |

With `gh`:

```sh
gh secret set VERCEL_TOKEN --env staging --body "…"
gh secret set VERCEL_TOKEN --env production --body "…"
# …and so on for each secret
```

## 5. First deploy

```sh
git push origin staging        # deploys staging
# review at https://kaam-web-staging.vercel.app, then merge a PR into main (direct pushes are blocked):
gh pr create --base main --head staging && gh pr merge --merge   # deploys production
```

## Local development

```sh
# backend, no Cognito needed
cd backend && uv sync
DATABASE_URL=sqlite:///./kaam.db uv run alembic upgrade head
DATABASE_URL=sqlite:///./kaam.db AUTH_DEV_BYPASS=true uv run uvicorn app.main:app --reload --port 8000

# frontend (another terminal)
cd frontend && npm install
EXPO_PUBLIC_API_URL=http://localhost:8000 EXPO_PUBLIC_AUTH_DEV_BYPASS=true npx expo start --web
```

With dev bypass on, the login screen takes any id + email and the API trusts it.
