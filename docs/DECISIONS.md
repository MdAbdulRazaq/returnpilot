# Decision log

Short, dated records of choices that shape the build. Newest first.

## 2026-07-09 — M5 frozen (detection engine)

- **Milestone 5 Status: FROZEN**
- Completed: Deterministic refund leak detection, pure detection engine, idempotent persistence, three alert reasons (NO_RETURN, RETURN_NOT_RECEIVED, QUANTITY_SHORTFALL), proportional moneyAtRisk calculation, full unit test suite.
- All checks pass: typecheck, lint, tests (26 passing).
- Further changes only for: bug fixes, security vulnerabilities, Shopify API changes.
- No new features.

## 2026-07-06 — M4 sync (refunds + returns)

- **Single Shopify client.** ALL Admin API traffic goes through `lib/shopify/graphql.ts`,
  which owns auth, retries, exponential backoff+jitter, throttling (HTTP 429 +
  GraphQL `THROTTLED`), and error handling. No other module calls Shopify's Admin
  API directly. (The frozen M3 `oauth.ts` keeps its one REST call for the OAuth
  token *exchange* — a different endpoint, out of M4 scope.)
- **Orders drive the read.** There is no top-level "refunds since X" query, so sync
  pages `orders(query:"updated_at:>=<cursor>", sortKey: UPDATED_AT)` and reads each
  order's `refunds` (plain array) + `returns` (connection). Cursor = `shops.sync_cursor`,
  advanced to the newest `updatedAt` only after a full successful run.
- **Idempotent by construction.** Every write keys on a Shopify ID with a UNIQUE
  constraint and upserts; line items are replaced per-parent. The `refunds/create`
  webhook and the hourly cron therefore converge instead of duplicating. Refund
  facts are immutable; returns are re-upserted to track status/quantity changes.
- **RESOLVED open question — `ReturnStatus` has no `RECEIVED`/`INSPECTED`.** The
  2025-07 enum is `REQUESTED | OPEN | DECLINED | CANCELED | CLOSED` only. "Goods
  actually back" is therefore derived in M5 from `ReturnLineItem.processedQuantity`,
  not from status. M4 persists `processed_quantity`/`refunded_quantity` for that.
- **Webhook registration is idempotent, done from sync** (M3's frozen callback
  never wired it). `ensureWebhooksRegistered()` registers `refunds/create` +
  `app/uninstalled` and swallows Shopify's "already exists" userError.
- **GDPR/compliance webhooks deferred.** `customers/data_request`, `customers/redact`,
  `shop/redact` are Shopify-mandatory for store submission but are compliance, not
  detection — kept out of M4 to hold scope. Add before app-store review.
- **Minimal input persistence.** Four normalized tables (`synced_refunds`,
  `synced_refund_line_items`, `synced_returns`, `synced_return_line_items`) hold
  exactly what M5 reads — detection INPUT. `refund_alerts` stays detection OUTPUT.
  Same deny-by-default RLS posture as M2; applied via the SQL Editor, no CLI.
- **60-day order window.** Without `read_all_orders`, Shopify exposes only the last
  60 days of orders; first sync defaults its cursor to 60 days ago. Documented, not
  worked around.

## 2026-07-06 — M3 Shopify OAuth + token encryption

- **Offline access tokens only**, sealed with **AES-256-GCM** in `lib/crypto.ts`.
  Ciphertext/iv/tag + `token_key_version` + `encrypted_at` stored on `shops`;
  plaintext never persisted or logged.
- **Key rotation via a versioned keyring.** Active key = `TOKEN_ENCRYPTION_KEY`
  at `TOKEN_ENCRYPTION_KEY_VERSION`; optional `TOKEN_ENCRYPTION_KEYS_RETIRED`
  (JSON version→key) opens old ciphertexts, decrypt-only. New tokens always use
  the active key.
- **CSRF via signed one-time `state`.** Random nonce in an HttpOnly + Secure +
  SameSite=Lax cookie, 10-min TTL, burned on callback.
- **HMAC verified per Shopify's spec** (sorted `key=value` query, minus `hmac`),
  compared with `timingSafeEqual` (constant-time).
- **Shop allowlist** `^[a-z0-9][a-z0-9-]*\.myshopify\.com$` before `shop` is ever
  used in a URL — SSRF / open-redirect prevention.
- **Generic OAuth errors.** One "Authentication failed." for every failure mode;
  callers never learn whether HMAC, state, or exchange failed.
- **Lean rate limiting (Decision A1).** Per-instance in-memory fixed window in
  `lib/rate-limit.ts`. KNOWN LIMITATION: not shared across serverless instances,
  resets on cold start — best-effort only; upgrade to Upstash Redis (A2) later.

## 2026-07-06 — M2 data model

- **Three tables only: `shops`, `settings`, `refund_alerts`.** `settings` uses
  `shop_id` as its primary key (the relation is 1:1 — no surrogate key). No
  `updated_at`/triggers (never read in V1). No `plan` column yet — billing is M9,
  add it then with a one-line `ALTER`. Don't build infra for features that don't
  exist.
- **Encrypted token in explicit columns, not packed.**
  `access_token_ciphertext` + `access_token_iv` + `access_token_tag` are three
  clear columns rather than one delimited blob — more readable and maintainable,
  and the packing "optimization" saved nothing real.
- **Deny-by-default RLS.** RLS enabled on all tables and every grant revoked from
  `anon`/`authenticated`. Only the server-side service-role client touches the DB,
  so tenant data has no public Data API surface. Queries scope by `shop_id` in
  app code (the tenant boundary); RLS is defense-in-depth.
- **Schema applied via the Supabase SQL Editor, not the CLI.** Avoids writing CLI
  login state outside the project folder.

## 2026-07-06 — M1 foundation

- **Next.js 15 App Router + RSC.** Dashboard is read-mostly; Server Components
  read Supabase directly with no client data-fetching layer. Less code to ship.
- **Node.js runtime everywhere, never Edge.** Shopify HMAC verification and
  AES-GCM token encryption need Node `crypto`.
- **Tailwind v4 via PostCSS plugin, no `tailwind.config.js`.** Tokens live in
  `app/globals.css`. Fewer files for a single-surface app.
- **DB access is server-only through the service-role client.** Tenant tables
  are never exposed to the browser via the anon key. RLS still enabled as
  defense-in-depth (per Supabase guidance).
- **Validated env in one place (`lib/env.ts`, `server-only`).** Fail loud, never
  read `process.env` ad hoc.
- **Project name = `ReturnPilot` (final).** Used consistently for the project
  folder (`D:\Projects\ReturnPilot`), the npm package (`returnpilot`), and the
  UI brand.
- **Email = Resend.** Simplest DX + free tier adequate for MVP volume.

## Open questions

- ~~Exact GraphQL fields for `Return` status across API version 2025-07~~ —
  RESOLVED in the M4 entry above: `ReturnStatus` has no `RECEIVED`/`INSPECTED`;
  detection uses `processedQuantity` instead.
- Money-at-risk line attribution: refunds don't always map 1:1 to return line
  items; M5 will define the fallback precisely. (M4 persists the shared LineItem
  id on both refund and return line items as the join key.)
- `@supabase/ssr` is installed but unused (we use Shopify OAuth, not Supabase
  Auth). Remove it in a later dependency-cleanup pass.
