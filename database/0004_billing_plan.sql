-- ReturnPilot -- billing plan column (Milestone 9)
--
-- Apply: paste this file into Supabase Dashboard → SQL Editor → Run.
-- (We deliberately avoid the Supabase CLI so nothing is written outside the project.)
--
-- Purpose: add plan column to shops table for subscription plan management
-- as part of M9 Billing work (Shopify Billing API integration).
--
-- Security notes (identical posture to previous migrations):
--   * RLS is enabled on this table and all grants are revoked from anon/authenticated.
--     Only the server-side service-role client (which bypasses RLS) touches this table.
--   * Tenant isolation is enforced in app code by scoping every query to shop_id.

-- Add plan column to shops table (nullable, no default)
alter table shops
  add column if not exists plan text;