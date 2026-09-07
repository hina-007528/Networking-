# Deployment

## Development (host apps + container data stores)

```bash
cp .env.example .env
pnpm install
pnpm docker:dev          # Postgres 5432, Redis 6379, Mailpit 1025/8025
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Set `MAIL_PROVIDER=smtp`, `SMTP_HOST=localhost`, `SMTP_PORT=1025` to capture mail in Mailpit.

## Production compose

Images:

| Service | Dockerfile |
| --- | --- |
| api | `infrastructure/docker/Dockerfile.api` |
| worker | `infrastructure/docker/Dockerfile.worker` |
| web | `infrastructure/docker/Dockerfile.web` |
| admin | `infrastructure/docker/Dockerfile.admin` |
| nginx | official `nginx:1.27-alpine` + `infrastructure/nginx/nginx.conf` |

```bash
cp .env.example .env
# set JWT_*, COOKIE_SECURE=true, SWAGGER_ENABLED=false, real DATABASE password
pnpm docker:prod
```

The API container runs `prisma migrate deploy` then `node dist/apps/api/src/main.js`. Seed is a separate, explicit step (`pnpm db:seed` against the composed database) so production data is never overwritten by demo accounts.

### Public URL map

| Path | Upstream |
| --- | --- |
| `/` | web:3000 |
| `/admin` | admin:3001 (`NEXT_PUBLIC_ADMIN_BASE_PATH=/admin` at image build) |
| `/api/` | api:4000 (Nest prefix `api/v1`) |
| `/health` | api:4000 |
| `/docs` | api:4000 |

Rebuild web and admin images after changing `NEXT_PUBLIC_*` — those values are inlined at `next build`.

### Health

- Liveness: `GET /health/live` (process up)
- Readiness: `GET /health/ready` (database answers)

Compose waits for Postgres and Redis health before starting the API, and for API health before starting web, admin, and the worker.

## Environment checklist

Copy `.env.example` and set at least:

- `DATABASE_URL` / `POSTGRES_*`
- `REDIS_URL`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `CORS_ORIGINS` (include the public site and admin origin)
- `COOKIE_DOMAIN`, `COOKIE_SECURE`
- `PAYMENT_PROVIDER`, `PAYMENT_SECRET`, `PAYMENT_RETURN_URL`
- `MAIL_PROVIDER` / `SMS_PROVIDER`
- `STORAGE_PROVIDER` (`local` or `s3`)

## CI

`.github/workflows/ci.yml`:

1. install → Prisma generate → lint → typecheck → unit tests → build
2. Playwright (Chromium) against the public site
3. `docker compose build` of api, worker, web, admin

## HTTPS

Terminate TLS in front of nginx (load balancer or a second nginx server block). Keep `COOKIE_SECURE=true` and list the HTTPS origins in `CORS_ORIGINS`.
