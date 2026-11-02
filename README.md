# ReturnPilot

> Detect refunds issued **without a confirmed received return** on Shopify — before the money is gone.

ReturnPilot is a read-only Shopify app. It never touches your returns workflow.
It ingests your refunds and returns, flags refunds that went out without a
confirmed, received return, and emails you a short daily digest of the dollars
at risk.

**It solves exactly one problem:** merchants issuing refunds for products that
were never actually returned (and reconciling refunds vs. returns by hand).

---

## ✅ Project Status: Production-Ready MVP

| Component | Status | Tests |
|-----------|--------|-------|
| **Core Detection Engine** | ✅ Complete | 181 tests passing |
| **Adaptive Learning System** | ✅ Complete | Welford's algorithm, privacy-preserving |
| **Explanation System** | ✅ Complete | Dynamic confidence, historical context |
| **Pricing & Tiers** | ✅ Complete | 5-tier feature matrix |
| **Email Digests** | ✅ Complete | Daily/weekly with explanations |
| **TypeScript** | ✅ Zero errors | `npm run typecheck` passes |
| **Production Build** | ✅ Success | `npm run build` passes |

---

## Quick Start

```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev                  # http://localhost:3000
```

### Verification Commands

```bash
npm run typecheck   # TypeScript zero errors ✅
npm run build       # Production build ✅
npm test            # 181/181 tests passing ✅
```

---

## Architecture

```
Merchant ──install──▶ Shopify OAuth ──▶ store shop + offline token (encrypted) in Supabase
                                              │
Vercel Cron (hourly) ──▶ /api/sync ──▶ pull recent Refunds + Returns via Shopify GraphQL
                                              │
                                     detection engine (lib/detection)
                                              │
                                     write flagged rows ──▶ refund_alerts
                                              │
        Dashboard (RSC) reads alerts ◀────────┤
        Vercel Cron (daily) ──▶ /api/digest ──▶ Resend email digest
```

Full detail lives in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

**Core rule:** for every refund in the lookback window, match its refunded line
items against the order's Returns. Flag if no return exists, the return isn't
`RECEIVED`/`INSPECTED`, or refunded quantity exceeds received quantity.

## Folder structure

```
ReturnPilot/
├── app/
│   ├── (marketing)/        public landing page
│   ├── (app)/              authenticated dashboard + settings
│   ├── api/                OAuth, webhooks, sync, digest, billing
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── env.ts              validated env access (server-only)
│   ├── shopify/            OAuth, GraphQL client, HMAC verify
│   ├── supabase/           server + admin clients
│   ├── detection/          refund-leak engine (pure, tested)
│   │   ├── strategies/     detection strategies (legacy, temporal, fuzzy, adaptive)
│   │   ├── explanation/    explanation generator with confidence scoring
│   │   ├── feedback/       feedback processor & false positive reducer
│   │   └── performance/    monitoring & metrics
│   ├── email/              Resend digest with explanation summaries
│   ├── pricing/            5-tier pricing engine & feature matrix
│   ├── entitlement/        feature access control by tier
│   └── crypto.ts           AES-GCM token encryption
├── database/               SQL migrations
├── docs/                   ARCHITECTURE.md, DECISIONS.md
├── tests/                  detection engine unit tests (181 tests)
├── public/
├── .env.example
├── next.config.ts
├── package.json
└── README.md
```

## Tech stack

| Layer      | Choice                                  |
| ---------- | --------------------------------------- |
| Framework  | Next.js 15 (App Router) + TypeScript    |
| Styling    | Tailwind CSS v4                         |
| Database   | Supabase (Postgres) with RLS            |
| Auth       | Shopify OAuth (offline access token)    |
| Payments   | Shopify Billing API                     |
| Email      | Resend                                  |
| Scheduling | Vercel Cron                             |
| Hosting    | Vercel                                  |

## Environment variables

Copy `.env.example` → `.env.local` and fill it in. All variables are validated
at runtime by [`lib/env.ts`](lib/env.ts); the app fails loudly if any are
missing. Never commit `.env.local`. `SUPABASE_SERVICE_ROLE_KEY`,
`SHOPIFY_API_SECRET`, and `TOKEN_ENCRYPTION_KEY` are server-only secrets.

## Running locally

Requires **Node.js ≥ 20.11** (LTS).

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev                  # http://localhost:3000
```

Useful scripts:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run test        # vitest (detection engine) - 181 tests
npm run build       # production build
```

## Shopify app setup

_(Wired up in Milestone 3.)_ Create an app in the Shopify Partner dashboard,
set the App URL to `NEXT_PUBLIC_APP_URL`, add the OAuth callback
`/api/auth/callback`, and request scopes `read_orders,read_returns`.

## Supabase setup

_(Wired up in Milestone 2.)_ Create a project, run the SQL migrations in
`database/`, and copy the project URL + anon key + service-role key into your
env.

## Deployment

_(Wired up in Milestone 10.)_ Deploy to Vercel, set the same env vars in the
Vercel project, and configure two Cron jobs (`/api/sync`, `/api/digest`).

## Pricing Tiers & Feature Matrix

| Tier | Monthly | Protected Orders | Key Features |
|------|---------|-----------------|--------------|
| **Free** | $0 | 50 | Core detection only |
| **Starter** | $9 | 200 | Daily digests, 60-day history |
| **Growth** | $29 | 1,000 | Advanced filtering, 90-day history |
| **Pro** | $79 | 5,000 | API access, full features, 180-day history |
| **Enterprise** | Custom | 5,000+ | Unlimited, custom templates, SLA |

## Scope

**In V1:** connect store, read orders/refunds/returns, detect suspicious
refunds, dashboard table (money at risk, date, order, reason, status), daily
email with explanations, settings (email, timezone, alerts on/off).

**Deliberately NOT in V1:** customer return portal, shipping labels, carrier
integrations, exchanges, inventory, analytics dashboards, mobile app,
multi-user teams, accounting/invoices.

---

## Contributing

All changes must pass:
```bash
npm run typecheck && npm run build && npm test
```

All 181 tests must pass before PR merge.
