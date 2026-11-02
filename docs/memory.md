# ReturnPilot Project State

## Current Project Status
**Development Ready** - Build blockers fixed. Ready to continue M6/M8 Dashboard + Settings implementation.

## Current Branch
master

## Completed Milestones
- **M1 Foundation** (2026-07-06): Next.js 15 App Router, Node.js runtime, Tailwind v4, server-only DB access, validated env, project naming, Resend email selection
- **M2 Data Model** (2026-07-06): Three tables (`shops`, `settings`, `refund_alerts`), encrypted token storage, deny-by-default RLS, service-role client with application-level scoping
- **M3 Shopify OAuth + Token Encryption** (2026-07-06): Offline access tokens, AES-256-GCM encryption, CSRF protection, HMAC verification, shop allowlist, generic OAuth errors, lean rate limiting
- **M4 Sync: Refunds + Returns** (2026-07-06): Single Shopify client, order-driven sync, idempotent upserts, resolved ReturnStatus detection using processedQuantity, idempotent webhook registration, minimal input persistence (4 sync tables), 60-day window limitation
- **M5 Detection Engine** (2026-07-09): Pure TypeScript detection engine (zero I/O), three alert reasons (NO_RETURN, RETURN_NOT_RECEIVED, QUANTITY_SHORTFALL), proportional moneyAtRisk calculation, full unit test suite (26 passing tests)
- **M7 Email Digest** (2026-07-17): Daily email notifications via Resend, lib/email/ service layer implemented, digest template with HTML and plain text versions, delivery tracking for idempotency and windowing, per-shop processing with lookback window configuration, alert limiting and deterministic ordering for emails

## Frozen Milestones
- **M5 Detection Engine**: Frozen as of 2026-07-09. Only receives bug fixes, security vulnerabilities, or Shopify API changes. No new features.

## Current Milestone
**M9 Billing**: Shopify Billing API integration, subscription plan management, usage-based or tiered pricing model, plan column to be added to shops table (simple ALTER when implemented)

## Current Task
Complete M6/M8 Dashboard + Settings implementation

## Pending Tasks
1. Complete M6/M8 Dashboard + Settings implementation
2. Implement M7 Email Digest (daily notifications via Resend) - COMPLETE
3. Implement M9 Billing (Shopify Billing API integration)
4. Complete M10 Deployment (Vercel deployment with cron jobs)
5. Perform final V1 testing and verification
6. Prepare for store submission/review

## Database Migrations
Applied in order:
1. **database/0001_init.sql** (M2): Initial schema - `shops`, `settings`, `refund_alerts` tables with RLS deny-by-default
2. **database/0002_sync.sql** (M4): Sync tables - `synced_refunds`, `synced_refund_line_items`, `synced_returns`, `synced_return_line_items` (detection INPUT)
3. **database/0003_email_digest.sql** (M7): Notification deliveries table for email tracking

All migrations designed to be applied via Supabase SQL Editor (avoids CLI login state outside project).

## Environment Variables
Required variables (from `.env.example`):
- **App**: `NEXT_PUBLIC_APP_URL`, `APP_ENV`
- **Shopify**: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_SCOPES`, `SHOPIFY_API_VERSION`
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Token Encryption**: `TOKEN_ENCRYPTION_KEY`, `TOKEN_ENCRYPTION_KEY_VERSION`, `TOKEN_ENCRYPTION_KEYS_RETIRED`
- **Cron Auth**: `CRON_SECRET`
- **Email (Resend)**: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_DIGEST_SECRET`
- **Email Config**: `EMAIL_INITIAL_LOOKBACK_DAYS`, `EMAIL_MAX_ALERTS_PER_EMAIL`, `EMAIL_RESEND_TIMEOUT_MS`

Validation: All variables validated at runtime by `lib/env.ts`; app fails loudly if any are missing.

## API Routes
- **GET /api/auth**: Initiate Shopify OAuth flow
- **GET /api/auth/callback**: OAuth callback handler (token exchange, encryption, storage)
- **GET /api/sync**: Hourly cron entry point for syncing shop data (protected by `CRON_SECRET`)
- **GET /api/settings**: Retrieve shop settings
- **POST /api/settings**: Update shop settings
- **GET /api/email/digest**: Internal email processing endpoint
- **POST /api/email/digest**: Daily digest cron entry point (protected by vercel-cron header and X-Email-Digest-Secret)
- **POST /app/api/webhooks/app-uninstalled**: Handle Shopify app uninstall webhook
- **POST /app/api/webhooks/refunds-create**: Handle real-time refund webhook (triggers near-real-time sync)
- **GET /app/api/alerts/[id]/dismiss**: Dismiss specific alert
- **GET /app/api/alerts/[id]/review**: Review specific alert

## Architecture Decisions
Key decisions documented in [DECISIONS.md](DECISIONS.md):
- **Single Shopify Client**: All Admin API**: Review specific alert
- **GET /app/api/alerts/[id]/review**: Review specific alert

## Architecture Decisions
Key decisions documented in [DECISIONS.md](DECISIONS.md):
- **Single Shopify Client**: All Admin API traffic funnels through `lib/shopify/graphql.ts` for auth, retries, backoff, throttling
- **Order-Driven Sync**: Sync reads orders updated since cursor, then expands to refunds/returns (workaround for lack of "refunds since" query)
- **Idempotent by Construction**: UNIQUE constraints on Shopify IDs with upserts ensure convergence between cron and webhook triggers
- **Detection Uses processedQuantity**: RESOLVED that ReturnStatus lacks RECEIVED/INSPECTED values; detection uses ReturnLineItem.processedQuantity as proxy for "goods actually back"
- **Minimal Input Persistence**: Four normalized sync tables hold exactly what detection engine reads; detection OUTPUT remains in `refund_alerts`
- **60-Day Order Window**: Documented limitation due to Shopify API restrictions without `read_all_orders` scope
- **Deny-by-default RLS**: Row Level Security enabled on all tables with grants revoked from anon/authenticated; service-role client bypasses RLS but queries still scope by shop_id
- **Server-Only Execution**: Node.js runtime everywhere (never Edge) due to crypto requirements for Shopify HMAC and AES-GCM
- **Token Encryption**: AES-256-GCM with versioned keyring support; plaintext tokens never persisted or logged
- **Lean Rate Limiting**: Per-instance in-memory fixed window on OAuth routes (planned Redis upgrade for shared limiting)
- **Webhook Verification**: HMAC-SHA256 verification of raw body before trusting any webhook payload
- **Generic Error Messages**: OAuth and authentication failures return generic messages to prevent information leakage
- **Shop Allowlist**: Regex validation prevents SSRF/open-redirect attacks
- **CSRF Protection**: Signed one-time `state` in HttpOnly+Secure+SameSite cookie with 10-minute TTL

## Known Issues
- Build fails due to route conflict: app/(dashboard)/page.tsx and app/(marketing)/page.tsx both resolve to root path. [FIXED]
- Build fails due to importing server-only module in a client component: lib/dashboard/format.ts marked server-only imported in client component RefundAlertsTable.tsx. [FIXED]
- Typecheck errors: 
    .next/types/validator.ts: Type 'typeof import("app/(dashboard)/page")' does not satisfy constraint 'AppPageConfig<"/">'.
    app/(dashboard)/dashboard/page.tsx: Cannot find module './Filters' or its corresponding type declarations.
  [FIXED]

## Technical Debt
- **Rate Limiting Sharing**: Current per-instance rate limiting (M3 Decision A1) not shared across serverless instances; planned upgrade to Upstash Redis (A2)
- **GDPR Webhooks**: Mandatory GDPR webhooks (`customers/data_request`, `customers/redact`, `shop/redact`) deferred to pre-store-review implementation (M4 resolution)
- **@supabase/ssr Dependency**: Installed but unused (Shopify Auth used instead of Supabase Auth); planned removal in dependency cleanup
- Refund line items without a shopifyLineItemId are skipped by the detection engine.
- **Billing Infrastructure**: No `plan` column in shops table yet; simple `ALTER` planned when M9 billing is implemented

## Verification Status
- **Typecheck**: PASS (no errors)
- **Linting**: PASS (npm run lint)
- **Unit Tests**: PASS (43 tests via npm run test)
- **Build**: FAILS only due to missing environment variables (intentional, not a code issue)
- **Last Verified**: 2026-07-17

## Testing Status
- **Detection Engine**: Fully unit-tested with 26 passing tests covering all alert reasons and edge cases
- **Integration/E2E**: Not implemented (YAGNI for V1 - focus on unit-testable core logic)
- **Test Framework**: Vitest
- **Test Location**: `tests/` and `__test__.ts` files alongside implementation
- **Test Coverage**: High for detection engine; minimal for glue code (in line with YAGNI principle)

## Security Status
- **Authentication**: Shopify OAuth with HMAC verification, CSRF protection, shop allowlist, generic error messages
- **Authorization**: Server-only Supabase client (service-role key) with application-level shop_id scoping + RLS defense-in-depth
- **Data Protection**: AES-256-GCM encryption for Shopify tokens, never stored in plaintext
- **Webhook Security**: HMAC-SHA256 verification before processing webhook payloads
- **Secrets Management**: All secrets via validated environment variables; no hardcoded secrets
- **Rate Limiting**: Per-instance fixed window on OAuth routes (planned upgrade)
- **Cron Protection**: Bearer token verification for /api/sync and /api/email/digest endpoints
- **Dependency Security**: Audited dependencies (Next.js, Supabase, Resend, Tailwind)
- **Last Security Review**: 2026-07-09 (coincident with M5 freeze)

## Dependencies
**Production Dependencies** (from package.json):
- `next`: 15.0.0 (React framework)
- `react`: 19.0.0
- `react-dom`: 19.0.0
- `@supabase/supabase-js`: 2.40.0
- `resend`: 3.2.0
- `zod`: 3.23.0 (schema validation)

**Development Dependencies**:
- `typescript`: 5.4.0
- `@types/node`: 20.0.0
- `@types/react`: 19.0.0
- `@types/react-dom`: 19.0.0
- `vitest`: 1.4.0
- `@vitest/ui`: 1.4.0
- `postcss`: 8.4.0
- `postcss-import`: 15.0.0
- `tailwindcss`: 4.0.0
- `eslint`: 8.57.0
- `eslint-plugin-next`: 0.0.0

**Note**: Uses pnpm or npm; exact lockfile versions in package-lock.json

## Last Verification Date
2026-07-17

## Verification Summary
All core functionality verified through:
- TypeScript type checking (currently passing)
- ESLint linting (no rule violations)
- Unit test suite (43/43 tests passing)
- Build success (currently failing only due to missing environment variables, which is intentional)
- Manual verification of implemented features against milestone specifications
- Architecture documentation alignment with implementation
- Last Verified: 2026-07-17 (today's date - documentation creation and verification)