# API

Base URL (development): `http://localhost:4000/api/v1`

The global prefix is `API_GLOBAL_PREFIX` (default `api/v1`). Health probes are excluded from the prefix and live at `/health/live` and `/health/ready`.

Interactive OpenAPI is published at `/docs` when `SWAGGER_ENABLED=true`.

## Envelope

Success:

```json
{ "success": true, "data": {}, "message": "optional" }
```

Failure:

```json
{ "success": false, "error": { "code": "STRING", "message": "human text", "details": {} } }
```

Clients must branch on `error.code`, not on the message string.

## Public (unauthenticated)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/cities` | Active cities |
| GET | `/cities/:slug/areas` | Areas for a city |
| GET | `/areas/:id/subareas` | Sub-areas |
| GET | `/coverage/summary` | City-level coverage rollup |
| POST | `/coverage/check` | Authoritative availability |
| POST | `/coverage/leads` | Lead when not available / coming soon |
| GET | `/plans` | Published plans |
| GET | `/plans/:slug` | Plan detail |
| POST | `/plans/compare` | Comparison payload |
| POST | `/pricing/quote` | Server-side quote (tax, city price, promo) |
| GET | `/products`, `/products/:slug` | Product catalogue |
| GET | `/offers`, `/offers/:slug` | Promotions |
| GET | `/faqs`, `/faqs/:slug` | Published FAQs |
| GET | `/cms/pages/:slug` | CMS page |
| GET | `/cms/hero-slides` | Homepage slides |
| GET | `/cms/site-settings` | Brand / helpline / SEO |
| POST | `/callbacks` | Request a callback |
| POST | `/analytics/events` | Beacon ingest |
| POST | `/auth/register`, `/auth/login`, `/auth/otp/*`, `/auth/forgot-password`, `/auth/reset-password` | Identity |

Coverage and quotes are never synthesised on the client. A down API is an error state.

## Customer (JWT, role `CUSTOMER`)

| Prefix | Resources |
| --- | --- |
| `/applications` | Draft, submit, read own connection applications |
| `/customer/*` | Profile, subscription, invoices, PDF, payments, notifications |
| `/payments` | Create a payment for an invoice |
| `/tickets` | Create and reply to tickets |

## Admin (JWT, staff roles + permissions)

All admin routes sit under `/admin` and require a staff role from `STAFF_ROLES`. Fine-grained keys (`plans.write`, `applications.approve`, …) are enforced with `@RequirePermissions`.

| Area | Paths |
| --- | --- |
| Dashboard | `/admin/analytics/dashboard`, `/admin/analytics/charts` |
| Customers / applications / subscriptions | `/admin/customers`, `/admin/applications`, `/admin/subscriptions` |
| Catalog | `/admin/plans`, `/admin/plans/prices`, `/admin/plans/addons`, `/admin/products`, `/admin/promotions`, `/admin/tax-rules` |
| Geography / coverage | `/admin/cities`, `/admin/areas`, `/admin/subareas`, `/admin/coverage`, `/admin/coverage/leads` |
| Billing | `/admin/invoices`, `/admin/payments`, `/admin/refunds` |
| Support | `/admin/tickets`, `/admin/callbacks`, `/admin/faqs` |
| CMS / settings | `/admin/content/hero-slides`, `/admin/content/pages`, `/admin/content/sections`, `/admin/settings` |
| Access | `/admin/users`, `/admin/roles`, `/admin/permissions`, `/admin/audit-logs` |

Literal segments (`plans/addons`, `coverage/leads`, `faqs/categories`) are declared before `:id` routes.

Canonical path helpers live in `packages/config/src/routes.ts` (`apiRoutes`).

## Idempotency and webhooks

- `Idempotency-Key` is accepted on payment creation and other replay-sensitive writes.
- `POST /payments/webhook` verifies the raw body against `PAYMENT_SECRET`. The JSON parser stores `rawBody` for that check.
- Replayed provider events are stored on `PaymentWebhook` and do not double-settle an invoice.

## Errors operators should recognise

| Code | Typical cause |
| --- | --- |
| `UNAUTHORIZED` / `FORBIDDEN` | Missing token or missing permission |
| `VALIDATION_ERROR` | Zod pipe rejected the body or query |
| `CONFLICT` | Unique slug / email / invoice number |
| `COVERAGE_UNAVAILABLE` | Application or quote for a non-serviceable location |
| `PAYMENT_VERIFICATION_FAILED` | Webhook signature or currency mismatch |
