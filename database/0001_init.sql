-- ReturnPilot — initial schema (Milestone 2)
--
-- Apply: paste this file into Supabase Dashboard → SQL Editor → Run.
-- (We deliberately avoid the Supabase CLI so nothing is written outside the project.)
--
-- Security notes:
--   * RLS is enabled on every table and all grants are revoked from anon/authenticated.
--     Only the server-side service-role client (which bypasses RLS) touches these tables,
--     so tenant data has no public Data API surface.
--   * The Shopify access token is stored as AES-256-GCM ciphertext + iv + auth tag in
--     three explicit columns (encrypted by lib/crypto.ts in M3). Plaintext is never stored.

create table shops (
  id                      uuid primary key default gen_random_uuid(),
  shop_domain             text not null unique,
  access_token_ciphertext text,                -- AES-256-GCM ciphertext (base64)
  access_token_iv         text,                -- GCM initialization vector (base64)
  access_token_tag        text,                -- GCM authentication tag (base64)
  token_key_version       smallint,            -- which encryption key sealed this token (rotation)
  encrypted_at            timestamptz,         -- when the token was last encrypted/stored
  scope                   text,
  sync_cursor             timestamptz,         -- last refund synced (M4)
  installed_at            timestamptz not null default now(),
  uninstalled_at          timestamptz
);

create table settings (
  shop_id            uuid primary key references shops(id) on delete cascade,
  notification_email text,
  timezone           text not null default 'UTC',
  alerts_enabled     boolean not null default true
);

create table refund_alerts (
  id                uuid primary key default gen_random_uuid(),
  shop_id           uuid not null references shops(id) on delete cascade,
  shopify_refund_id text not null,
  shopify_order_id  text not null,
  order_name        text,
  refund_amount     numeric(12,2) not null,
  currency          text not null,
  money_at_risk     numeric(12,2) not null,
  reason            text not null check (reason in ('NO_RETURN','RETURN_NOT_RECEIVED','QUANTITY_SHORTFALL')),
  status            text not null default 'open' check (status in ('open','reviewed','dismissed')),
  refunded_at       timestamptz,
  detected_at       timestamptz not null default now(),
  unique (shop_id, shopify_refund_id)
);

-- Deny-by-default RLS. The service-role client bypasses RLS; anon/authenticated get nothing.
alter table shops         enable row level security;
alter table settings      enable row level security;
alter table refund_alerts enable row level security;

revoke all on shops         from anon, authenticated;
revoke all on settings      from anon, authenticated;
revoke all on refund_alerts from anon, authenticated;
