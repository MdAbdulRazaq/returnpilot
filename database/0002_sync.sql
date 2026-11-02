-- ReturnPilot — sync tables (Milestone 4)
--
-- Apply: paste this file into Supabase Dashboard → SQL Editor → Run.
-- (We deliberately avoid the Supabase CLI so nothing is written outside the project.)
--
-- Purpose: hold the MINIMAL normalized Shopify refund + return data the M5
-- detection engine reads. These four tables are detection INPUT; `refund_alerts`
-- (from 0001_init.sql) is detection OUTPUT.
--
-- Security notes (identical posture to 0001):
--   * RLS is enabled on every table and all grants revoked from anon/authenticated.
--     Only the server-side service-role client (bypasses RLS) touches these tables;
--     tenant data has no public Data API surface.
--   * Tenant isolation is enforced in app code by scoping every query to shop_id.
--
-- Idempotency: each Shopify object has a UNIQUE (shop_id, shopify_*_id) key so the
-- sync upserts converge instead of duplicating on re-run / webhook+cron overlap.

-- ── Refunds ───────────────────────────────────────────────────────────────────
create table synced_refunds (
  id                uuid primary key default gen_random_uuid(),
  shop_id           uuid not null references shops(id) on delete cascade,
  shopify_refund_id text not null,
  shopify_order_id  text not null,
  order_name        text,
  refund_amount     numeric(12,2) not null,
  currency          text not null,
  refunded_at       timestamptz,          -- Refund.createdAt
  synced_at         timestamptz not null default now(),
  unique (shop_id, shopify_refund_id)
);

create index synced_refunds_shop_order_idx
  on synced_refunds (shop_id, shopify_order_id);

create table synced_refund_line_items (
  id                   uuid primary key default gen_random_uuid(),
  refund_id            uuid not null references synced_refunds(id) on delete cascade,
  shopify_line_item_id text,              -- LineItem id (null if unattributed)
  name                 text,
  quantity             integer not null,
  subtotal             numeric(12,2) not null,
  restock_type         text
);

create index synced_refund_line_items_refund_idx
  on synced_refund_line_items (refund_id);

-- ── Returns ───────────────────────────────────────────────────────────────────
create table synced_returns (
  id                uuid primary key default gen_random_uuid(),
  shop_id           uuid not null references shops(id) on delete cascade,
  shopify_return_id text not null,
  shopify_order_id  text not null,
  name              text,
  -- ReturnStatus: REQUESTED | OPEN | DECLINED | CANCELED | CLOSED.
  -- NOTE: there is NO RECEIVED/INSPECTED status; "goods actually back" is derived
  -- in M5 from processed_quantity on the line items, not from this column.
  status            text not null,
  total_quantity    integer not null,
  synced_at         timestamptz not null default now(),
  unique (shop_id, shopify_return_id)
);

create index synced_returns_shop_order_idx
  on synced_returns (shop_id, shopify_order_id);

create table synced_return_line_items (
  id                   uuid primary key default gen_random_uuid(),
  return_id            uuid not null references synced_returns(id) on delete cascade,
  shopify_line_item_id text,              -- fulfillmentLineItem.lineItem.id (join key to refunds)
  name                 text,
  quantity             integer not null,  -- units requested for return
  processed_quantity   integer not null,  -- units processed (proxy for "received")
  refunded_quantity    integer not null
);

create index synced_return_line_items_return_idx
  on synced_return_line_items (return_id);

-- ── Deny-by-default RLS (service-role client bypasses; anon/authenticated get nothing) ──
alter table synced_refunds            enable row level security;
alter table synced_refund_line_items  enable row level security;
alter table synced_returns            enable row level security;
alter table synced_return_line_items  enable row level security;

revoke all on synced_refunds            from anon, authenticated;
revoke all on synced_refund_line_items  from anon, authenticated;
revoke all on synced_returns            from anon, authenticated;
revoke all on synced_return_line_items  from anon, authenticated;
