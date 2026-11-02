# ReturnPilot — Architecture

## 1. Problem & wedge

Shopify merchants lose real cash when a refund is issued but the returned
product **never actually comes back** (or comes back short / damaged and is
still refunded in full). Leading returns apps (Loop, AfterShip) automate the
refund but don't reliably reconcile "was it received?" — one documented case was
$15K in unrecoverable refunds.

ReturnPilot is a **focused, read-only watchdog** for exactly this leak. It is
not a returns platform and does not replace one.

## 2. Non-goals (hard boundaries)

Return portal · shipping labels · carriers · exchanges · inventory · analytics ·
mobile · multi-user/roles · accounting. None of these ship in V1. Every one of
them is a different product.

## 3. Components

| Component        | Tech                        | Responsibility                                             |
| ---------------- | --------------------------- | ---------------------------------------------------------- |
| Web app          | Next.js 15 App Router (RSC) | Landing, dashboard, settings                               |
| API routes       | Next.js Route Handlers      | OAuth, webhooks, sync, digest, billing                     |
| DB               | Supabase Postgres + RLS     | Shops, alerts, settings, sync cursors                      |
| Detection engine | Pure TS (`lib/detection`)   | Refund-vs-return matching. No I/O → unit-testable          |
| Scheduler        | Vercel Cron                 | Hourly `/api/sync`, daily `/api/digest`                    |
| Email            | Resend                      | Daily digest                                               |

## 4. Data flow

### 4.1 Install (Milestone 3)
1. Merchant hits `/api/auth?shop=xyz.myshopify.com`.
2. We verify the shop domain, redirect to Shopify consent (`read_orders,read_returns`).
3. Callback verifies HMAC + `state`, exchanges the code for an **offline access
   token**, encrypts it (AES-256-GCM) and stores it on the `shops` row.
4. Register webhooks: `app/uninstalled`, `refunds/create`, plus mandatory GDPR
   webhooks.

### 4.2 Sync (Milestone 4)
- Hourly cron calls `/api/sync` (authenticated by `CRON_SECRET`).
- For each active shop, page orders updated since the stored cursor via the
  Shopify GraphQL Admin API (single client, `lib/shopify/graphql.ts`), reading
  each order's `refunds` and `returns`.
- Normalize and **upsert into the M4 sync tables** (idempotent, keyed on Shopify
  IDs). Advance the cursor to the newest `updatedAt` after a full run. Detection
  itself is M5, reading those tables and writing `refund_alerts`.
- `refunds/create` webhook (HMAC-verified) triggers a near-real-time single-order
  sync so data is fresh without waiting for the hourly job. `app/uninstalled`
  marks the shop uninstalled and clears its token.

### 4.3 Detection (Milestone 5) — the core
For a refund `R` on order `O`:
```
refundedItems = line items in R (variant, quantity, amount)
returns       = O.returns with their line items and status
```
Flag `R` when ANY holds:
- **NO_RETURN** — a refunded item has no corresponding return record.
- **RETURN_NOT_RECEIVED** — a matching return exists but the goods aren't
  confirmed back. NOTE (confirmed against 2025-07 in M4): `ReturnStatus` is only
  `REQUESTED | OPEN | DECLINED | CANCELED | CLOSED` — there is NO `RECEIVED`/
  `INSPECTED` value. "Confirmed back" is derived from a return line item's
  `processedQuantity` (units actually processed), which M4 persists.
- **QUANTITY_SHORTFALL** — refunded quantity > processed/received return quantity.

`moneyAtRisk` for a flagged refund = the portion of the refund amount tied to the
unconfirmed items (fall back to full refund amount when line attribution is
unavailable). The engine is pure (no network, no DB) so it is fully unit-tested.

### 4.4 Surface (Milestones 6–7)
- Dashboard: Server Component reads `refund_alerts` for the current shop and
  renders a table — money at risk, refund date, order, reason, status — sorted
  by dollars at risk.
- Daily digest: cron calls `/api/digest`; for each shop with alerts + alerts
  enabled, send one Resend email with the count and total at risk.

## 5. Data model (Milestone 2)

- **shops** — `id`, `shop_domain` (unique), `access_token_ciphertext`,
  `access_token_iv`, `access_token_tag`, `scope`, `sync_cursor`,
  `installed_at`, `uninstalled_at`. The offline token is stored as AES-256-GCM
  ciphertext + iv + auth tag in three explicit columns; plaintext is never stored.
- **settings** — `shop_id` (PK, FK → `shops`, on delete cascade),
  `notification_email`, `timezone`, `alerts_enabled`.
- **refund_alerts** — `id`, `shop_id` (FK), `shopify_refund_id`,
  `shopify_order_id`, `order_name`, `refund_amount`, `currency`,
  `money_at_risk`, `reason` (enum), `status`, `refunded_at`, `detected_at`,
  unique(`shop_id`, `shopify_refund_id`).

### M4 sync tables (`database/0002_sync.sql`) — detection INPUT

Normalized Shopify facts the M5 engine reads (vs `refund_alerts`, which is
detection OUTPUT). Each keyed by a Shopify ID with a UNIQUE(`shop_id`, …) for
idempotent upsert:

- **synced_refunds** — refund id/order/amount/currency/`refunded_at`.
- **synced_refund_line_items** — per refund: `shopify_line_item_id`, `quantity`,
  `subtotal`, `restock_type`.
- **synced_returns** — return id/order/`status`/`total_quantity`.
- **synced_return_line_items** — per return: `shopify_line_item_id` (the shared
  join key to refund line items), `quantity`, `processed_quantity`,
  `refunded_quantity`.

RLS is enabled on all tables and every grant is **revoked** from `anon` and
`authenticated` (deny-by-default). The app touches the DB only through the
**server-side service-role client**; no table is exposed to the browser via the
anon key, so there is no public Data API surface for tenant data. Because the
service-role client bypasses RLS, every query is scoped by `shop_id` in
application code — the query filter is the tenant boundary, RLS is defense-in-depth.

## 6. Security

- Secrets only in env (`lib/env.ts` validates on boot). Service-role key,
  Shopify secret, and encryption key are server-only.
- Shopify OAuth: validate the `*.myshopify.com` shop domain (allowlist regex,
  blocks SSRF/open-redirect); verify `hmac` per Shopify's spec with a
  constant-time compare; verify a one-time `state` nonce held in an HttpOnly +
  Secure + SameSite=Lax cookie (10-min TTL) for CSRF. Every failure returns one
  generic "Authentication failed." — the specific failing check is never revealed.
- Token encryption: AES-256-GCM via `lib/crypto.ts`. Ciphertext/iv/tag +
  `token_key_version` + `encrypted_at` stored on `shops`. Versioned keyring
  supports rotation (active key encrypts; retired keys decrypt-only). Plaintext
  tokens are never persisted or logged.
- Rate limiting (MVP, Decision A1): per-instance in-memory fixed window on the
  OAuth routes. Known limitation — not shared across serverless instances; a
  Redis-backed shared limiter (A2) is the planned upgrade.
- Webhooks (M4): verify HMAC-SHA256 of the raw body against `SHOPIFY_API_SECRET`
  before trusting any payload (constant-time). Unverified payloads persist nothing.
- Single Shopify client (M4): all Admin API traffic funnels through
  `lib/shopify/graphql.ts` — the one place the token is attached and the only
  module allowed to `fetch` Shopify. Retries/backoff/throttle live there.
- Cron endpoints require the `CRON_SECRET` bearer token (constant-time compare).
- Node.js runtime everywhere (crypto), never Edge.

## 7. Decision log

See [DECISIONS.md](DECISIONS.md).
