# Reference Website Analysis — stormfiber.com

> **Scope and legal note.** This document records observations of the *publicly accessible* StormFiber
> marketing website, gathered from public pages and search-indexed content. No private API, admin
> system, database, or credentialed resource was accessed. No StormFiber source code, logo,
> photography, or theme asset is reused in this project. Every visual asset in our implementation is
> either originally designed, an SVG/CSS construction, or a CMS-managed placeholder that the operator
> can replace with assets they own. The goal is **functional and experiential parity**, not a clone.

Audit date: 2026-09-04
Reference: `https://stormfiber.com/`
Customer portal (separate host, public pages only): `https://my.stormfiber.com/`
Help center (separate host): `https://helpcenter.stormfiber.com/`

---

## 1. Platform observations

| Aspect | Observation | Implication for our build |
| --- | --- | --- |
| Marketing site | WordPress, custom theme at `/wp-content/themes/stormfiber/` | We rebuild as Next.js App Router with a database-backed CMS |
| Customer portal | Separate PHP app at `my.stormfiber.com` (`signin.php`, `signup.php`) | We integrate the portal as `/login`, `/register`, `/dashboard/*` in the same Next.js app, backed by our own API |
| Help center | Third-party hosted knowledge base | We rebuild in-app at `/support/help-center` from our own `faqs` tables |
| City context | A city selection modal appears globally and gates plans, pricing, support phone numbers and signup | City is a **first-class global state** in our build, persisted and reflected in the URL |
| Coverage | `check-availability` page with city selector, a Pakistan coverage map, and three result states | Real backend coverage engine with `AVAILABLE` / `NOT_AVAILABLE` / `COMING_SOON` and lead capture |
| Forms | Callback and lead capture forms rendered as modals on almost every page | Global modal system + real `POST /callbacks` and `POST /coverage/leads` endpoints |

---

## 2. Header and navigation

### Utility bar (top-right, desktop)

- `Check Availability` → `/check-availability/`
- `Sign In` → external portal `https://my.stormfiber.com/`

### Primary navigation

| Label | Type | Targets |
| --- | --- | --- |
| Plans | link | `/plans/` |
| Products | dropdown | `Ultra-Fast Internet` → `/products/ultra-fast-internet/`, `HD TV` → `/products/hdtv/`, `Crystal Clear Voice` → `/products/crystal-clear-voice/` |
| Support | dropdown | `Billing` → `/support/`, `Help Center` → `helpcenter.stormfiber.com`, `Get in Touch` → `/support/get-in-touch/` |
| Get StormFiber | primary CTA button | `/get-stormfiber/` |

### Logo

SVG wordmark linking to `/`. Reference uses `logo-nav.svg` plus a decorative `storm.svg`.
**Our implementation:** an original SVG mark rendered from our own design tokens, with the site logo
also overridable through CMS settings.

### Mobile navigation

Hamburger toggle expands a full-height panel repeating the same tree, plus `Check Availability` and
`Sign In`. Dropdown parents (`Products`, `Support`) become expandable accordions rather than hover
menus.

**Our implementation:** `MobileNavigation` with focus trap, `Escape` to close, scroll lock, and
accordion disclosure for nested groups.

---

## 3. Global overlays / modals

Observed on nearly every marketing page:

1. **City selector** — heading "Please select your city", full city list, validation message
   "Kindly select a city".
2. **Contact / callback capture** — heading "Please enter your details", body "Please share your
   contact details. One of our business development representatives will shortly get in touch with
   you.", plus a `Back` control and a success state "Thank you for the contact details. We will get
   in touch with you shortly."
3. **Coverage available** — "We are available in your area!" + resolved area label (example seen:
   "D.H.A. Phase 6 Karachi") + contact capture + `Check plans` CTA.
4. **Coverage unavailable** — "We are currently not available here." + "Please leave your contact
   details with us and we will get in touch with you as soon as we go LIVE in your area." + capture
   + `Check plans` CTA.
5. **Support city modal** — selecting a city reveals a city-specific helpline following the pattern
   `(city code) 111-1-78676`, plus a branch address and map link.

**Our implementation:** one accessible `Modal` primitive (Radix Dialog) with composed contents:
`CitySelectorModal`, `CallbackModal`, `CoverageResultModal`. Every submission hits a real endpoint
and stores a record.

---

## 4. Cities observed publicly

Abbottabad, Bahawalpur, Chitral, Faisalabad, Gujrat, Gujranwala, Haripur, Hyderabad, Islamabad,
Jhelum, Karachi, Lahore, Mardan, Multan, Okara, Peshawar, Quetta, Rahim Yar Khan, Rawalpindi,
Sargodha, Sahiwal, Sheikhupura, Sialkot, Swat, Wah.

Public reporting describes coverage in 25+ cities and explicitly notes that **coverage varies by
neighbourhood even within a covered city**.

**Our implementation:** `City → Area → SubArea → CoverageZone`. Coverage is never inferred from the
city; it is resolved from configured zones, so an area inside a live city can still be
`NOT_AVAILABLE` or `COMING_SOON`.

---

## 5. Homepage

### Hero

Large campaign slider driven by CMS uploads. Split headline treatment with an emphasised word, a
short supporting line, and one primary CTA. Storm/weather metaphor throughout ("Storm into the
Future", lightning-bolt iconography).

**Our implementation:** `HeroSlider` reading `hero_slides` from the database, with:
desktop/mobile image fields, optional video, autoplay with pause-on-hover and
`prefers-reduced-motion` respect, prev/next controls, dot navigation, swipe, arrow-key support, and
`aria-roledescription="carousel"` semantics.

### Section flow (top to bottom)

| Section | Content | Our data source |
| --- | --- | --- |
| Hero slider | Campaign slides | `hero_slides` |
| Product trio | Ultra-fast internet, HD TV, voice | `products` + CMS |
| Benefits | 100% fiber, reliability, low latency, one line for three services | `cms_sections` |
| Featured plans | Plan cards with speed + price, city-aware | `plans` + `plan_prices` |
| Promotions | Limited-time offers | `promotions` |
| Coverage | Pakistan map + city CTA | `cities`, `coverage_zones` |
| FAQs | Condensed accordion | `faqs` |
| Closing CTA | "Get StormFiber" | `cms_sections` |
| Footer | Availability, signup, legal, social | `cms` footer links |

### Visual language

Dark navy/near-black header, light content surfaces, high-contrast accent for CTAs, bold display
headlines with one accent-coloured word, generous white space, rounded premium cards, lightning
motif, restrained motion.

**Our design tokens** (original values, not copied hex codes): deep navy surface family, electric
cyan/teal accent for primary actions, warm amber for promotional badges, neutral gray scale for
text, 8px spacing scale, three radius steps, two elevation steps.

---

## 6. Route inventory

| Reference URL | Purpose | Sections / components | Data + API needs | Responsive notes | SEO |
| --- | --- | --- | --- | --- | --- |
| `/` | Marketing home | Header, hero slider, product trio, benefits, featured plans, promos, coverage, FAQ, CTA, footer | CMS slides/sections, featured plans, promotions, cities, FAQs | Single column ≤768px; 3-col product grid ≥1024px | ISR, `Organization` + `WebSite` JSON-LD |
| `/plans/` | Plan catalog | City gate, service tabs (Internet / TV / Phone / Triple Play / Double Play / Standard / Limited Time Offers), plan card grid, comparison | `GET /plans?city&service&speed&price`, city pricing, tax | Tabs become horizontal scroll; cards stack | ISR + `Product`/`Offer` JSON-LD |
| `/plans/[city]` | City-priced catalog | Same as above, city-scoped | City-specific `plan_prices` + `city_tax_rules` | same | Canonical per city, `LocalBusiness` |
| `/packages/[slug]` | Individual promo/plan detail | Hero, inclusions, price breakdown, CTA | `GET /plans/:slug` | Stacked summary panel | `Product` JSON-LD |
| `/products/` | Product hub | Three product cards | `products` | 1→3 col | Indexable |
| `/products/ultra-fast-internet/` | Internet product | Speed messaging (up to 275 Mbps publicly advertised), symmetric speeds, feature blocks, CTA | `products` + CMS sections | Alternating image/text stacks on mobile | `Product` JSON-LD |
| `/products/hdtv/` | TV product | Feature blocks incl. Electronic Programming Guide, Learning Remote, Fast Channel Change, Conditional Access System | `products` + CMS | same | `Product` JSON-LD |
| `/products/crystal-clear-voice/` | Phone product | Works without mobile signal, no distortion, postpaid "use now pay later", free on-net calls | `products` + CMS | same | `Product` JSON-LD |
| `/check-availability/` | Coverage checker | City select, area select, coverage map, three result modals | `GET /cities`, `GET /cities/:slug/areas`, `POST /coverage/check`, `POST /coverage/leads` | Map hidden/simplified on small screens | Indexable shell, results client-side |
| `/get-stormfiber/` | New connection request | City selector, "It's time to Storm into the Future!" heading, details form, coverage branch | Applications + OTP + coverage + plans + pricing | Wizard is one step per screen on mobile | Indexable landing, `noindex` for in-progress steps |
| `/get-stormfiber-2/` | Alternate signup variant | Same overlay pattern | same | same | Alias / campaign variant |
| `/support/` | Billing & payment help (the "Billing" nav target) | "Diverse options to pay your bills", NayaPay billing, online billing via bank internet payment gateway, in-person billing, advance payment discounts, portal CTA | CMS + payment methods + city branch data | Method cards stack | `FAQPage` + `HowTo` |
| `/support/get-in-touch/` | Contact | Per-city helpline list (`(0xx) 111-1-78676`), `Request callback` modal, email | `GET /cities`, `POST /callbacks` | Accordion per city on mobile | `LocalBusiness` per branch |
| `helpcenter.stormfiber.com` | Knowledge base | Search + categories: About, Billing, Policies, Products & Services, Self-Troubleshooting | Rebuilt as our `faq_categories` + `faqs` | Search-first on mobile | `FAQPage` |
| `/faqs/[slug]` | Single FAQ | Question heading, answer body | `GET /faqs/:slug` | — | `Question` JSON-LD |
| `/faqs-category/[slug]` | FAQ category listing | Question list | `GET /faqs?category=` | — | `FAQPage` |
| `/terms-and-conditions/` | Legal | Long-form numbered clauses incl. a privacy/legal-compliance section | `cms_pages` | Sticky in-page nav ≥1024px | Indexable |
| `my.stormfiber.com/signin.php` | Portal login | Username (mobile number) + password | Our `POST /auth/login` | — | `noindex` |
| `my.stormfiber.com/signup.php` | Portal registration | Step 1 personal info, step 2 contact info, step 3 credentials (email as user id, password min 8 with upper/lower/digit/special), terms acceptance, mobile-number uniqueness + validation | Our `POST /auth/register` + OTP | — | `noindex` |

### Publicly documented behaviours worth reproducing

- **Billing cycle:** first invoice generated immediately after account creation and service
  selection; subsequently billed on the 1st of each month, payable by the 10th; invoices
  downloadable from the portal. → drives our `invoiceQueue` schedule and invoice due-date rules.
- **Self-service in portal:** pay by card, add TV service to an existing internet account, request
  upgrade/downgrade (publicly stated to be allowed after a promotion period ends), download tax
  certificates. → drives our subscription change-request model.
- **Fair usage policy:** no volume cap advertised, with a regulator-aligned fair-usage policy. →
  modelled as plan metadata + a CMS policy page.
- **Bundles:** Triple Play (internet + TV + phone), Double Play (internet + phone), internet-only
  standard plans, and limited-time promotional plans; installation charge presented as either a
  one-time charge or instalments. → drives `PlanCategory`, `PlanAddon`, `Promotion`, and the
  `installationPrice` + instalment metadata on plans.
- **Pricing varies by city and promotion.** → `plan_prices` keyed by `(planId, cityId)` with
  server-side tax resolution.

---

## 7. User journeys

1. **Discovery → conversion**
   Home → Plans → city gate → service tab → plan card → `Get StormFiber` → wizard → application
   submitted.
2. **Coverage-first**
   `Check Availability` → city → area → result.
   `AVAILABLE` → show plans for that city → start application.
   `NOT_AVAILABLE` → capture lead.
   `COMING_SOON` → capture interested customer with expected live date.
3. **Support / billing education**
   Support → payment options → sign in to portal → pay bill.
4. **Contact**
   Get in Touch → select city → call the city helpline **or** request a callback → agent follow-up.
5. **Existing customer**
   Sign In → dashboard → view current bill → pay → download invoice → raise ticket.

---

## 8. Responsive behaviour observed

| Breakpoint | Behaviour |
| --- | --- |
| ≤414px | Single column, full-screen menu, full-width CTAs, stacked plan cards, modals nearly full-screen |
| 768px | Two-column feature grids, hero text above image |
| ≥1024px | Hover dropdowns, three-column product grid, side-by-side hero |
| ≥1440px | Content clamped to a max container with increased vertical rhythm |

Our targets: 320, 375, 414, 768, 1024, 1280, 1440, 1920.

---

## 9. Motion observed

- Hero slide transitions (crossfade/slide)
- Scroll-reveal on section entry
- Hover elevation on cards and nav dropdown reveal
- Modal fade + scale

Our policy: only hero transitions, modal transitions, and a single subtle scroll-reveal utility.
Everything is disabled under `prefers-reduced-motion: reduce`. No gradient/glassmorphism excess.

---

## 10. Gaps we deliberately implement more deeply than the reference

The reference marketing site delegates most transactional behaviour to a separate portal and to
phone agents. Our reimplementation makes these first-class, database-backed flows:

- Full 9-step connection wizard with OTP and a server-computed price breakdown
- Application lifecycle with status history
- Subscription lifecycle with upgrade/downgrade requests
- Invoice generation with PDF download
- Provider-agnostic payments with server-side verification, webhooks, and idempotency
- Ticketing with messages, attachments, assignment, and timeline
- Complete admin console with RBAC, CMS, coverage management, and audit logs
