# Security

## Transport and HTTP

- Helmet on the API. CSP is relaxed only when Swagger is enabled in non-production.
- `trust proxy = 1` so rate limits and audit logs see the client behind nginx.
- CORS allow-list from `CORS_ORIGINS` with credentials.
- nginx hides `server_tokens`, sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- `client_max_body_size 20m` aligned with upload limits.

## Secrets

Never commit `.env`. Rotate at least:

- `JWT_SECRET` / `JWT_REFRESH_SECRET` (64+ random characters each)
- `PAYMENT_SECRET` (webhook HMAC)
- `POSTGRES_PASSWORD`
- `S3_ACCESS_KEY` / `S3_SECRET_KEY` when using object storage
- SMTP / SMS credentials

Seed passwords in `.env.example` are for empty local databases only.

## Authentication

See [authentication.md](authentication.md). Summary:

- bcrypt password hashes
- rotating refresh tokens, reuse detection
- account lockout after failed logins
- OTP attempt and resend limits
- staff console refuses `CUSTOMER` sessions

## Authorisation

Every admin mutation is decorated with `@Roles(...STAFF_ROLES)` and a `Permission.*` key. Super-admin is the only role that implicitly holds all permissions. Role edits are audited.

## Data rules that prevent fraud

- Coverage is resolved server-side (sub-area → area → city zone). Applications re-check before submit.
- Quotes and invoices compute tax and city prices in Nest, not in React.
- Payment settle and invoice balance update run in one Prisma transaction.
- Webhooks verify the raw body. Idempotency keys stop double charges from client retries.
- Soft-deleted catalogue rows remain for historical invoices.

## Analytics and PII

`AnalyticsEvent` stores a truncated IP prefix, not a full address. Audit logs record actor, action, entity, and request id.

## Containers

Docker images run as user `stormfiber`, not root. Production compose does not publish Postgres or Redis ports; only nginx `:80` is exposed.

## Swagger

`SWAGGER_ENABLED` must be `false` on the public internet. The schema describes auth and admin routes.

## What this repo is not

It is not a penetration-test harness. Do not add exploit samples, credential dumps, or copies of third-party proprietary assets.
