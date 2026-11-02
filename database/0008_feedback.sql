-- ReturnPilot — Feedback Schema (Milestone 10 Package 4)
--
-- Apply: paste this file into Supabase Dashboard → SQL Editor → Run.
--
-- Security notes:
--   * RLS is enabled on this table and all grants are revoked from anon/authenticated.
--     Only the server-side service-role client (which bypasses RLS) touches this table,
--     so tenant data has no public Data API surface.
--   * Only stores merchant feedback on alerts, no PII beyond what's necessary for audit.
--   * Feedback is store-scoped and optional.

create table alert_feedback (
  id                uuid primary key default gen_random_uuid(),
  shop_id           uuid not null references shops(id) on delete cascade,
  alert_id          uuid not null references refund_alerts(id) on delete cascade,
  feedback_type     text not null check (feedback_type in ('confirmed', 'false_positive', 'comment')),
  comment           text,
  created_at        timestamptz not null default now()
);

-- Deny-by-default RLS. The service-role client bypasses RLS; anon/authenticated get nothing.
alter table alert_feedback enable row level security;

revoke all on alert_feedback from anon, authenticated;