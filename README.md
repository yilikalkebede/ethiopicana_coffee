# Latitude Coffee Co.

A premium coffee ecommerce + subscription platform, sourced entirely from
Ethiopia. This repo is being built in phases (see **Roadmap** below);
Phases 1 through 9 are complete — catalog, cart, checkout, subscriptions,
inventory, shipping, the full admin/manager portal, rewards/reviews/gifts/
coupons, and email/SEO/analytics/performance. Phase 10 (this drop) adds an
automated test suite, an accessibility pass, and deployment prep. See
**Deployment** below to actually put this live.

## What's in Phase 1

- Next.js 14 (App Router) + TypeScript + Tailwind project scaffold
- Full Prisma schema covering users/roles/permissions, catalog, inventory,
  orders, subscriptions, shipping, coupons, rewards, gifts, reviews, and
  audit logs (`prisma/schema.prisma`)
- Email/password auth: registration, login, logout, session cookies
  (`src/lib/auth.ts`, `src/app/api/auth/*`)
- Role-based access control (CUSTOMER / MANAGER / ADMIN) enforced
  **server-side** on every protected route, with an example admin action
  (role changes) that writes to `AuditLog`
- Base UI: original brand identity (single-country Ethiopian specialist —
  every lot traces to a named Ethiopian region/washing station), homepage,
  navbar/footer, protected `/account`, `/manager`, `/admin` shells reading
  live data from Postgres
- Seed script with three role accounts and 11 Ethiopian coffees (regions:
  Yirgacheffe, Sidama, Guji, Harrar, Limu, Jimma), spanning Single Origin,
  Blends, Decaf, and Cold Brew, with real `InventoryTransaction` rows behind
  every seeded stock level

## What's in Phase 2

- **Catalog** (`src/app/shop/`) — server-rendered browse/search/filter/sort
  against the live catalog; `/shop/[slug]` product detail pages with a
  grind/bag-size selector and live stock status
- **Cart** — a real DB-backed cart (`Cart`/`CartItem` in
  `prisma/schema.prisma`), not client-only state: works for guests (tracked
  via an httpOnly `latitude_cart` cookie) and logged-in users, merges a
  guest cart into the account cart on login/register
  (`src/lib/cart.ts`, `src/app/api/cart/*`), with a slide-out drawer and a
  full `/cart` page sharing the same data
- **Checkout** (`/checkout`) — real address collection (saved-address picker
  for logged-in users, which is the first real use of the `Address` model;
  inline form for guests), a live order summary from the actual cart.

## What's in Phase 3

- **Stripe Checkout** — `/checkout`'s submit now creates a real `Order` +
  `OrderItem`s (`PENDING`) and a real Stripe Checkout Session
  (`src/app/api/checkout/route.ts`), then redirects to Stripe's hosted
  payment page. Logged-in shoppers get a real Stripe Customer, finally
  putting `User.stripeCustomerId` to use.
- **Webhook-driven order confirmation** (`src/app/api/webhooks/stripe/route.ts`)
  — the browser redirect back from Stripe never marks anything paid by
  itself. Only a signature-verified `checkout.session.completed` event
  does: it creates the `Payment` row, flips the order to `PAID`,
  decrements inventory with real `InventoryTransaction` (`SALE`) rows, and
  only *then* clears the cart. Idempotent against Stripe's at-least-once
  delivery (keyed on `Payment.stripePaymentIntentId`).
- **Oversell handling** — if stock moved between add-to-cart and payment
  confirmation, inventory is clamped at 0 (never negative) and the order's
  `fulfillmentStatus` is set to `REQUIRES_ATTENTION` instead of silently
  misreporting stock or crashing.
- **`/checkout/success`** — looks up the real order; if the webhook hasn't
  landed yet it polls a narrow, unauthenticated status endpoint
  (`/api/orders/[id]/status`) rather than ever claiming success before the
  database says so.
- **`/account/orders` + `/account/orders/[id]`** — real, ownership-checked
  order history; the first real use of the `/account/orders` link that's
  sat in `Footer.tsx` since Phase 1.

Still out of scope, per the roadmap: inventory *reservation* locking
(Phase 5), real shipping rates (Phase 6), tax calculation (Phase 7), order
confirmation emails (Phase 9), and admin/manager order management UI
(Phase 7).

## What's in Phase 4

- **`/subscribe`** — the guided, multi-step builder (brew method → roast →
  flavor → grind → amount → frequency → review), with a live matched-coffee
  preview and live pricing on the review step
  (`src/components/SubscriptionBuilder.tsx`, `/api/subscriptions/preview`).
  Requires an account (the schema's `Subscription.shippingAddressId` is a
  real FK to `Address`, which needs a `User`) — a `/register` page was
  added since none existed before, and the builder saves your answers to
  `sessionStorage` across that redirect so signing in doesn't lose them.
- **Real Stripe recurring billing** — `POST /api/subscriptions` creates an
  actual Stripe Subscription via a hosted Checkout Session
  (`mode: "subscription"`), not a one-off charge. Every renewal after that
  is Stripe's own billing engine firing on its own schedule; this app only
  reacts to it via `invoice.paid` — no homegrown cron job pretending to be
  a billing engine.
- **Deterministic coffee matching** (`src/lib/personalization.ts`) — spec
  §8's "start with rules, let AI replace them later." Scores the live,
  active catalog against a subscriber's roast/brew/flavor preferences,
  with a small tie-break toward the current featured coffee. Decaf is
  excluded from the default candidate pool since the builder has no
  caffeine-preference step — a real bug caught by testing the matcher
  against the seeded catalog before it ever reached the UI.
- **Full self-service** (`/account/subscription`,
  `src/app/api/account/subscriptions/[id]/*`) — pause and resume use
  Stripe's own `pause_collection`; "skip next shipment" is the same
  primitive with an auto `resumes_at` one interval out, not a homegrown
  flag, and "resume" clears either case. Changing frequency/amount updates
  the live Stripe price (`proration_behavior: "none"` — no surprise
  mid-cycle charges); Stripe blocks price changes while collection is
  paused, so that's surfaced as a clear message rather than a raw error.
  "Update payment method" opens Stripe's own Billing Portal — this
  codebase still never touches card data. Every action logs a
  `SubscriptionEvent`.
- Renewal, payment-failure, and cancellation webhook paths were verified
  with self-signed synthetic Stripe events against a *real* Stripe test
  subscription (created directly via the API) rather than waiting weeks
  for an actual billing cycle — same technique proven in Phase 3.

All of Phases 2–4 talk to the same Postgres/Prisma models as Phase 1 — no
mock data, no fake stock numbers, no fake payment state.

## Getting started

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL at minimum
npm run db:generate
npm run db:migrate        # creates tables from prisma/schema.prisma
npm run db:seed           # creates admin/manager/customer + sample coffees
npm run dev
```

Seeded logins (change these immediately in anything beyond local dev):

| Role     | Email                              | Password       |
|----------|-------------------------------------|----------------|
| Admin    | admin@latitudecoffee.example        | ChangeMe123!   |
| Manager  | manager@latitudecoffee.example      | ChangeMe123!   |
| Customer | customer@latitudecoffee.example     | ChangeMe123!   |

You need a real Postgres instance for `DATABASE_URL` (local Postgres,
Docker, or a managed provider like Neon/Supabase/RDS). Email and shipping
keys still aren't required — those integrations are scaffolded in later
phases behind provider-agnostic interfaces.

Checkout now needs real (test-mode is fine) Stripe keys:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

To receive webhooks locally, install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
and run:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

That command prints the `whsec_...` value to put in `.env`. Without it,
the checkout form itself still validates addresses correctly, but the
final "Continue to payment" step will fail (Stripe rejects the API call)
rather than silently pretending to succeed.

## Where things live

```
prisma/schema.prisma      full relational schema
src/lib/auth.ts           password hashing, sessions, requireRole()/requireUser()
src/lib/cart.ts           cart identity (guest cookie vs. user), merge-on-login
src/lib/stock.ts          stock-status helpers (safe to import from client components)
src/lib/config.ts         temporary business constants (free-shipping threshold, etc.)
src/middleware.ts         coarse route gating (real checks are server-side)
src/app/api/auth/*        register / login / logout
src/app/api/admin/*       example RBAC + audit-logged admin action
src/lib/stripe.ts         Stripe client singleton
src/lib/orders.ts         order numbers, cart→totals, order-status labels
src/app/api/cart/*        cart CRUD
src/app/api/checkout      address collection + Order + Stripe Checkout Session creation
src/app/api/webhooks/stripe   signature-verified, idempotent payment confirmation
src/app/api/orders/[id]/status   minimal unauthenticated poll target for /checkout/success
src/lib/orderNumber.ts    generateOrderNumber() — split from orders.ts so its Node
                          `crypto` import can't leak into a client bundle
src/lib/personalization.ts   deterministic coffee-matching rules (spec §8)
src/lib/subscriptionPricing.ts   plan pricing, Stripe interval mapping, frequency labels
src/lib/subscriptions.ts  ownership-check helper shared by the self-service routes
src/app/api/subscriptions        creates the recurring Stripe Checkout Session
src/app/api/subscriptions/preview   read-only live-preview endpoint for the builder
src/app/api/account/subscriptions/[id]/*   pause / resume / skip / cancel / billing-portal / PATCH
src/app/(marketing)       public site (homepage lives at src/app/page.tsx)
src/app/shop               catalog browse + /shop/[slug] product detail
src/app/cart, /checkout   cart page and checkout flow
src/app/checkout/success  post-payment confirmation (real order, webhook-aware)
src/app/subscribe         guided subscription builder
src/app/register          account creation (added in Phase 4 — subscriptions require login)
src/app/account           customer portal (protected)
src/app/account/orders    real order history + detail (protected)
src/app/account/subscription   subscription management (protected)
src/app/manager           manager dashboard (protected)
src/app/admin             admin dashboard (protected)
src/components            shared UI (Navbar, Footer, CartProvider/CartDrawer, SubscriptionBuilder/Manager, …)
```

## Security notes for anyone extending this

- **Never trust the client for authorization.** `src/middleware.ts` only
  redirects logged-out visitors for UX; the actual role check happens in
  each server component/route via `requireRole()` / `getCurrentUser()`,
  which re-verifies the session against the database on every request.
- Session tokens are stored **hashed** (`Session.tokenHash`); the raw token
  only ever exists in the httpOnly cookie.
- Sensitive admin actions (e.g. role changes) must write an `AuditLog` row
  in the same transaction as the change — see
  `src/app/api/admin/users/[id]/role/route.ts` for the pattern to copy.
- Payment-card data is never touched by this codebase — Stripe handles it
  entirely; only Stripe references (`stripeCustomerId`,
  `stripeSubscriptionId`, `stripePaymentIntentId`) are stored.
- **Payment state is only ever written by the webhook handler**
  (`src/app/api/webhooks/stripe/route.ts`), never by the checkout API or
  the success page — both of those only ever *read* order status. The
  webhook verifies Stripe's signature on every request
  (`stripe.webhooks.constructEvent`) and is idempotent (keyed on
  `Payment.stripePaymentIntentId`) since Stripe delivers webhooks
  at-least-once and can retry.

## Roadmap

- ~~**Phase 2** — product catalog pages, search/filter, cart, checkout UI~~ done
- ~~**Phase 3** — Stripe integration, orders, payment webhooks~~ done
- ~~**Phase 4** — subscription engine + guided subscription builder + full
  account-portal self-service (pause/skip/change/cancel)~~ done
- ~~**Phase 5** — inventory dashboard, reservations, purchase orders~~ done
- ~~**Phase 6** — shipping integration (EasyPost), fulfillment, tracking~~ done
  — code complete and verified via fallback paths + synthetic signed
  webhooks; real label-purchase/live-rate testing still pending an EasyPost
  API key
- ~~**Phase 7** — full admin dashboard, user/product/content management~~ done
- ~~**Phase 8** — rewards, reviews, gifts, coupons~~ done
- ~~**Phase 9** — analytics, SEO, email automation, performance~~ done
  — email infrastructure is code-complete and verified end-to-end except
  real delivery, pending a Resend API key
- ~~**Phase 10** — automated test suite, accessibility pass, deployment~~ done
  — Vitest unit suite (94 tests) + Playwright E2E/accessibility suite (17
  tests, real axe-core scans) + GitHub Actions CI, all locally dry-run
  verified. Actually creating the GitHub/Vercel/database accounts and
  clicking deploy is the one deliberate handoff — see **Deployment** below.

Each phase will ship as working, reviewable code — no stubbed dashboards or
fake data — matching the order in the original spec.

## Testing

- `npm run test` — Vitest unit suite covering the app's pure/near-pure
  business logic (discount math, reward points, stock-status thresholds,
  subscription pricing, coupon validation, personalization scoring, zod
  validation schemas, and more). No database required.
- `npm run test:e2e` — Playwright end-to-end suite against a real running
  build: registration/login, RBAC across customer/manager/admin, shop →
  cart → checkout, the full subscription builder through to a real Stripe
  Checkout redirect, and an automated accessibility scan (`@axe-core/playwright`)
  across every major page. Requires a real, migrated Postgres database
  with the seed data from `prisma/seed.ts` (same DB `npm run dev` uses
  locally is fine).
- `.github/workflows/ci.yml` runs both suites (plus lint, `tsc --noEmit`,
  and a real `npm run build`) on every push/PR once this repo has a GitHub
  remote — provisions its own throwaway Postgres service container, so it
  needs no secrets to pass (Stripe/EasyPost/Resend all degrade gracefully
  to a no-op when their API key is unset — verified by building with all
  three blanked out).

## Deployment

Target: **Vercel + a managed Postgres provider** (Neon or Supabase — both
give you the pooled/direct connection pair `DATABASE_URL`/`DIRECT_URL`
already expects, per `prisma/schema.prisma`'s `directUrl`).

1. **Database**: create a Neon or Supabase Postgres project. Copy its
   pooled connection string into `DATABASE_URL` and its direct (non-pooled)
   connection string into `DIRECT_URL`.
2. **Push the schema**: with those two vars set locally (or via
   `vercel env pull`), run `npm run db:deploy` (`prisma migrate deploy`,
   non-interactive-safe) once against the new database. Optionally
   `npm run db:seed` if you want the same demo catalog/accounts this repo
   develops against.
3. **Vercel project**: import this repo (`vercel.com/new`), framework
   preset auto-detects Next.js — no custom build command needed.
4. **Environment variables**: set every key from `.env.example` in the
   Vercel project's dashboard — `DATABASE_URL`, `DIRECT_URL`,
   `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`/`STRIPE_WEBHOOK_SECRET`,
   `EMAIL_API_KEY`/`EMAIL_FROM`, `SHIPPING_API_KEY`/`SHIPPING_WEBHOOK_SECRET`,
   and `NEXT_PUBLIC_APP_URL` (your real production URL, once known —
   Vercel gives you this after the first deploy, then update the var and
   redeploy).
5. **Deploy**. Vercel builds and serves the app; `GET /api/health` (added
   in Phase 10) is a real database-connectivity check — hit it right after
   the first deploy to confirm the DB vars actually took, not just that
   the process booted.
6. **Register the two real webhooks** against your live URL, both already
   built and verified against synthetic signed events in earlier phases:
   - Stripe: `https://<your-domain>/api/webhooks/stripe`, events
     `checkout.session.completed`, `checkout.session.expired`,
     `invoice.paid`, `invoice.payment_failed`,
     `customer.subscription.deleted`, `customer.subscription.updated` —
     copy the new webhook's signing secret into `STRIPE_WEBHOOK_SECRET`.
   - EasyPost: `https://<your-domain>/api/webhooks/easypost` (event:
     tracker updates) — copy its secret into `SHIPPING_WEBHOOK_SECRET`.

Not done by this repo on your behalf: creating the GitHub/Vercel/Neon
accounts, pushing to a remote, or running the actual deploy — those need
your own login, so this is the one deliberate handoff point in the whole
project.
