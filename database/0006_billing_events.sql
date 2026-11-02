-- ReturnPilot -- billing events table (Package 2)
--
-- Apply: paste this file into Supabase Dashboard → SQL Editor → Run.
-- (We deliberately avoid the Supabase CLI so nothing is written outside the project.)
--
-- Purpose: Create table for billing audit logging
-- as part of Package 2 Shopify Billing Integration Foundation.
--
-- Security notes (identical posture to previous migrations):
--   * RLS is enabled on this table and all grants are revoked from anon/authenticated.
--     Only the server-side service-role client (which bypasses RLS) touches this table.
--   * Tenant isolation is enforced in app code by scoping every query to shop_id.

-- Create billing_events table for audit logging
create table billing_events (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references shops(id) on delete cascade,
  event_type      text not null, -- trial_started, trial_ended, subscription_created, subscription_updated, subscription_cancelled, payment_failed, payment_succeeded, usage_limit_warned, etc.
  event_data      jsonb,         -- Context-specific data (amounts, plan changes, etc.)
  created_at      timestamptz not null default now(),
  processed_at    timestamptz
);

-- Index for querying events by shop
create index billing_events_shop_id_idx on billing_events(shop_id);

-- Index for querying recent events
create index billing_events_created_at_idx on billing_events(created_at desc);

-- Deny-by-default RLS. The service-role client bypasses RLS; anon/authenticated get nothing.
alter table billing_events enable row level security;

revoke all on billing_events from anon, authenticated;