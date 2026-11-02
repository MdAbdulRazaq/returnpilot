-- ReturnPilot -- email digest delivery tracking (Milestone 7)
--
-- Apply: paste this file into Supabase Dashboard → SQL Editor → Run.
-- (We deliberately avoid the Supabase CLI so nothing is written outside the project.)
--
-- Purpose: track email delivery attempts for daily digest notifications.
-- Each row represents one attempt to send the digest email to a shop.
--
-- Security notes (identical posture to previous migrations):
--   * RLS is enabled on this table and all grants are revoked from anon/authenticated.
--     Only the server-side service-role client (which bypasses RLS) touches this table.
--   * Tenant isolation is enforced in app code by scoping every query to shop_id.

create table notification_deliveries (
  id                      uuid primary key default gen_random_uuid(),
  shop_id                 uuid not null references shops(id) on delete cascade,
  notification_type       text not null check (notification_type = 'daily_digest'),
  window_start            timestamptz not null,
  window_end              timestamptz not null check (window_end > window_start),
  sent_at                 timestamptz,
  status                  text not null check (status in ('sent','failed')),
  provider_message_id     text,
  alert_count             integer not null check (alert_count >= 0),
  duration_ms             integer not null check (duration_ms >= 0),
  created_at              timestamptz not null default now()
);

-- Index to fetch the most recent successful delivery per shop & type (using window_end)
create index idx_notif_deliveries_latest_success
on notification_deliveries (shop_id, notification_type, window_end desc)
where status = 'sent';

-- Partial unique index to enforce idempotency for successful deliveries
create unique index uq_notif_deliveries_sent
on notification_deliveries (shop_id, notification_type, window_start, window_end)
where status = 'sent';

-- Deny-by-default RLS. The service-role client bypasses RLS; anon/authenticated get nothing.
alter table notification_deliveries enable row level security;

revoke all on notification_deliveries from anon, authenticated;