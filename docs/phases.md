# ReturnPilot Development Phases

## Milestone Overview
ReturnPilot development follows a milestone-based approach where each milestone delivers a specific set of capabilities. Milestones are referenced throughout the codebase in folder comments and documentation.

## Completed Milestones

### M1 Foundation (Completed 2026-07-06)
- Next.js 15 App Router + React Server Components
- Node.js runtime everywhere (never Edge) for Node crypto requirements
- Tailwind CSS v4 via PostCSS plugin (no tailwind.config.js)
- Database access only through server-side service-role client
- Centralized environment validation in lib/env.ts
- Consistent project branding: ReturnPilot
- Email service selected: Resend (simplest DX + adequate free tier)

### M2 Data Model (Completed 2026-07-06)
- Three core tables: `shops`, `settings`, `refund_alerts`
- Encrypted Shopify access token stored as AES-256-GCM ciphertext/iv/tag in explicit columns
- Deny-by-default Row Level Security on all tables
- Service-role client bypasses RLS but queries scoped by shop_id for tenant isolation
- Schema applied via Supabase SQL Editor (avoids CLI login state outside project)

### M3 Shopify OAuth + Token Encryption (Completed 2026-07-06)
- Offline access tokens only (long-lived refresh capability)
- AES-256-GCM encryption via lib/crypto.ts with versioned keyring support
- CSRF protection via signed one-time `state` in HttpOnly+Secure+SameSite cookie
- HMAC verification per Shopify specification with timingSafeEqual
- Shop allowlist regex to prevent SSRF/open-redirect
- Generic OAuth error messages (no information leakage)
- Lean per-instance rate limiting (planned Redis upgrade)

### M4 Sync: Refunds + Returns (Completed 2026-07-06)
- Single Shopify client: all Admin API traffic through lib/shopify/graphql.ts
- Order-driven sync: pages orders updated since cursor, reads refunds + returns
- Idempotent by construction: UNIQUE constraints on Shopify IDs with upserts
- RESOLVED: No RECEIVED/INSPECTED ReturnStatus; detection uses processedQuantity
- Idempotent webhook registration from sync (not OAuth callback)
- GDPR webhooks deferred (compliance, not detection scope)
- Minimal input persistence: four normalized sync tables (detection INPUT)
- 60-day order window limitation documented (Shopify API restriction)

### M5 Detection Engine (Completed 2026-07-09 - FROZEN)
- Pure TypeScript detection engine (zero I/O, fully unit-testable)
- Three alert reasons:
  - NO_RETURN: No return record exists (after grace period)
  - RETURN_NOT_RECEIVED: Return exists but processedQuantity = 0
  - QUANTITY_SHORTFALL: Refunded quantity > processedQuantity
- Proportional moneyAtRisk calculation when line-item attribution available
- Full unit test suite (26 passing tests)
- Status: FROZEN (only bug fixes, security updates, Shopify API changes)

## Current Milestone

### M9 Billing (In Progress)
Based on folder structure annotations:
- app/(app)/ dashboard + settings marked as (M6/M8)
- Implementation includes:
  - Server-rendered dashboard with alert table
  - Settings page for notification email and alert preferences
  - Summary cards showing alert counts and money at risk
  - Expandable alert rows with detailed information
  - URL-driven pagination, filtering, and sorting
  - Status badges and reason badges for visual feedback

## Planned Milestones

### M7 Email Digest (Planned)
- Daily email notifications via Resend
- lib/email/ service layer implemented
- Digest template with HTML and plain text versions
- Delivery tracking for idempotency and windowing
- Per-shop processing with lookback window configuration
- Alert limiting and deterministic ordering for emails

### M9 Billing (Planned)
- Shopify Billing API integration
- Subscription plan management
- Usage-based or tiered pricing model
- Plan column to be added to shops table (simple ALTER when implemented)

### M10 Deployment (Planned)
- Deployment to Vercel platform
- Environment variable configuration in Vercel
- Two Cron jobs configured:
  - Hourly: /api/sync
  - Daily: /api/email/digest
- Production domain setup and verification

## Scope Summary (V1)
**Included in V1:**
- Shopify store connection via OAuth (M3)
- Hourly sync of orders/refunds/returns (M4)
- Detection of refunds without confirmed returns (M5 - FROZEN)
- Dashboard table showing alerts with money at risk, date, order, reason, status (M6/M8)
- Daily email digest of new alerts (M7)
- Settings for notification email and alert toggles (M6/M8)
- Shopify Billing API integration (M9)

**Explicitly Excluded from V1:**
- Customer return portal
- Shipping labels
- Carrier integrations
- Exchanges
- Inventory management
- Analytics dashboards
- Mobile app
- Multi-user teams
- Accounting/invoices

## Development Principles
- Milestones are incremental and additive
- Later milestones build on earlier ones without changing core interfaces
- FROZEN milestones (like M5) only receive bug fixes and critical updates
- No infrastructure built for features not in current/newest milestone
- Each milestone delivers end-user value independently where possible