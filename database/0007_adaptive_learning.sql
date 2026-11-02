-- ReturnPilot — Adaptive Learning Parameters (Milestone 10 Package 2)
--
-- Apply: paste this file into Supabase Dashboard → SQL Editor → Run.
--
-- Security notes:
--   * RLS is enabled on this table and all grants are revoked from anon/authenticated.
--     Only the server-side service-role client (which bypasses RLS) touches this table,
--     so tenant data has no public Data API surface.
--   * Only stores aggregated statistics (mean, M2, count) for privacy preservation.
--     No raw order data or PII is stored in this table.

create table adaptive_learning_parameters (
  shop_id                      uuid primary key references shops(id) on delete cascade,
  refund_amount_mean           numeric(12,2),           -- Mean refund amount for baseline
  refund_amount_m2             numeric(12,2),           -- Sum of squares of differences from mean (for variance)
  refund_amount_count          integer,                 -- Number of samples for refund amount baseline
  refund_count_mean            numeric(12,2),           -- Mean refund count for baseline
  refund_count_m2              numeric(12,2),           -- Sum of squares of differences from mean
  refund_count_count           integer,                 -- Number of samples for refund count baseline
  line_item_count_mean         numeric(12,2),           -- Mean line item count for baseline
  line_item_count_m2           numeric(12,2),           -- Sum of squares of differences from mean
  line_item_count_count        integer,                 -- Number of samples for line item count baseline
  seasonal_pattern_monday      numeric(5,4),            -- Average activity multiplier for Monday (0-7+)
  seasonal_pattern_tuesday     numeric(5,4),            -- Average activity multiplier for Tuesday
  seasonal_pattern_wednesday   numeric(5,4),            -- Average activity multiplier for Wednesday
  seasonal_pattern_thursday    numeric(5,4),            -- Average activity multiplier for Thursday
  seasonal_pattern_friday      numeric(5,4),            -- Average activity multiplier for Friday
  seasonal_pattern_saturday    numeric(5,4),            -- Average activity multiplier for Saturday
  seasonal_pattern_sunday      numeric(5,4),            -- Average activity multiplier for Sunday
  global_refund_average        numeric(12,2),           -- Global average refund amount for seasonal adjustment
  updated_at                   timestamptz not null default now()
);

-- Deny-by-default RLS. The service-role client bypasses RLS; anon/authenticated get nothing.
alter table adaptive_learning_parameters enable row level security;

revoke all on adaptive_learning_parameters from anon, authenticated;