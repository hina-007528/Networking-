# StormFiber Platform

Production-grade ISP platform: public website, customer portal, admin console, and NestJS API backed by PostgreSQL. Plans, coverage, applications, billing, tickets, and CMS content all come from the database — the frontends do not invent successful coverage, quotes, or payments when the API is down.

This is an independent reimplementation. StormFiber logos, photography, and other proprietary assets are not used; the operator replaces CMS placeholders with assets they own.

## Applications

| App | Package | Default URL | Role |
| --- | --- | --- | --- |
| Public site + customer portal | `@stormfiber/web` | http://localhost:3000 | Marketing pages, coverage check, connection wizard, dashboard |
| Admin console | `@stormfiber/admin` | http://localhost:3001 | Staff operations, catalog, coverage, billing, RBAC |
| REST API | `@stormfiber/api` | http://localhost:4000/api/v1 | All writes and authoritative reads |
| Worker | same API package | — | BullMQ billing and notification jobs |

Shared packages live in `packages/`: `config`, `types`, `validation`, `ui`, `eslint-config`, `typescript-config`.

## Prerequisites

- Node.js 20.11+ (22 recommended)
- pnpm 9.15.9 (`corepack enable && corepack prepare pnpm@9.15.9 --activate`)
- Docker Desktop (Postgres, Redis, and the production stack)

## Local development

```bash
cp .env.example .env
pnpm install
pnpm docker:dev
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Website: http://localhost:3000
- Admin: http://localhost:3001
- API: http://localhost:4000/api/v1
- Swagger: http://localhost:4000/docs
- Mailpit (captured mail): http://localhost:8025

`docker-compose.dev.yml` starts only Postgres, Redis, and Mailpit. The apps run on the host through Turborepo so hot reload stays fast on Windows.

## Seed accounts

Defined in `.env.example`. Change them before any shared environment.

| Role | Email | Password |
| --- | --- | --- |
| Super admin | `superadmin@stormfiber.local` | `ChangeMe!2026` |
| Admin | `admin@stormfiber.local` | `ChangeMe!2026` |
| Manager | `manager@stormfiber.local` | `ChangeMe!2026` |
| Support | `support@stormfiber.local` | `ChangeMe!2026` |
| Finance | `finance@stormfiber.local` | `ChangeMe!2026` |
| Sales | `sales@stormfiber.local` | `ChangeMe!2026` |
| Customer | `customer@stormfiber.local` | `ChangeMe!2026` |

OTP codes are emailed only. They are never returned in API responses or shown on screen.

## Common commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start web, admin, and API in watch mode |
| `pnpm typecheck` | TypeScript across the workspace |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright against the public site |
| `pnpm build` | Production builds |
| `pnpm db:migrate` | Create / apply Prisma migrations |
| `pnpm db:seed` | Load cities, plans, CMS, RBAC, and demo accounts |
| `pnpm docker:prod` | Build and start the full container stack behind nginx |

## Production stack

```bash
cp .env.example .env
# replace JWT secrets, cookie flags, and payment keys
pnpm docker:prod
```

nginx publishes:

- `/` → website
- `/admin` → admin console (`basePath=/admin`)
- `/api/` → NestJS (`api/v1` prefix)
- `/health` and `/docs` → API probes / Swagger (Swagger off when `SWAGGER_ENABLED=false`)

See [docs/deployment.md](docs/deployment.md).

## Documentation

- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [API](docs/api.md)
- [Authentication](docs/authentication.md)
- [Payments](docs/payments.md)
- [Security](docs/security.md)
- [Testing](docs/testing.md)
- [Deployment](docs/deployment.md)
- [Reference analysis](docs/reference-analysis.md)

## Legal

Observations of the public stormfiber.com site are recorded in `docs/reference-analysis.md`. No StormFiber source, private APIs, or brand assets are reused.
