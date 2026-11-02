-- ReturnPilot -- billing fields (Package 2)
--
-- Apply: paste this file into Supabase Dashboard → SQL Editor → Run.
-- (We deliberately avoid the Supabase CLI so nothing is written outside the project.)
--
-- Purpose: add billing fields to shops table for subscription management
-- as part of Package 2 Shopify Billing API integration.
--
-- Security notes (identical posture to previous migrations):
--   * RLS is enabled on this table and all grants are revoked from anon/authenticated.
--     Only the server-side service-role client (which bypasses RLS) touches this table.
--   * Tenant isolation is enforced in app code by scoping every query to shop_id.

-- Add billing fields to shops table (with appropriate defaults where needed)
alter table shops
  add column if not exists billing_active boolean not null default false,
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists subscription_id text,
  add column if not exists next_billing_at timestamptz,
  add column if not exists usage_current_period integer not null default 0,
  add column if not exists usage_reset_at timestamptz not null default now(),
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_effective_at timestamptz;