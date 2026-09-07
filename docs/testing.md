# Testing

## Unit (Vitest)

| Package | What it covers |
| --- | --- |
| `@stormfiber/api` | Money helpers, slugs, pagination, application state machine, IP prefix, roles guard |
| `@stormfiber/validation` | Zod primitives |
| `@stormfiber/config` | Format helpers |
| `@stormfiber/web` | City fallbacks (`isActive`, metro slugs) |

```bash
pnpm test
```

API tests use `apps/api/vitest.config.ts` (SWC + path aliases). They do not boot Postgres.

## End-to-end (Playwright)

Config: `apps/web/playwright.config.ts`

```bash
pnpm --filter @stormfiber/web dev   # or rely on the built-in webServer
pnpm test:e2e
```

Specs:

- `e2e/public-journeys.spec.ts` — home, plans, coverage form required fields, login
- `e2e/critical-flows.spec.ts` — connection wizard, ticket login gate, FAQs/contact, legal pages

These journeys assert real UI. They do **not** fake a green coverage result or a paid invoice. Those assertions belong in an environment with a running API and seed data.

Projects: Desktop Chrome and Pixel 7. CI installs Chromium only and sets `CI=true` (retries, no leftover `test.only`).

## What “done” looks like for a change

- Domain rule change: add or update a Vitest spec next to the helper (state machine, money, slug, guard).
- Public UI change: extend a Playwright spec so a heading, form, or navigation still exists.
- Admin write: hit the real Nest route (Zod + permission). Do not add a client-only success path.

## Typecheck and lint

```bash
pnpm typecheck
pnpm lint
```

`apps/api` typecheck uses `tsc --noEmit`. Generate the Prisma client first (`pnpm db:generate`) or editors will miss generated enums.
