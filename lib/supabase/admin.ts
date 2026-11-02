import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getEnv } from "@/lib/env";

/**
 * Server-only Supabase client (service-role key).
 *
 * This is the ONLY entry point for database access. Never import it from client
 * components — the `server-only` guard turns any such import into a build error.
 *
 * The service-role key bypasses Row Level Security, so every query issued through
 * this client MUST scope by `shop_id`. RLS is our defense-in-depth, not our tenant
 * boundary; the query filter is the tenant boundary.
 *
 * All reads/writes use the supabase-js query builder, which sends parameterized
 * requests to PostgREST — user data is never concatenated into SQL.
 */

// ── Row types (inlined to keep M2 to a single file; no codegen tool) ──────────

export type RefundReason =
  | "NO_RETURN"
  | "RETURN_NOT_RECEIVED"
  | "QUANTITY_SHORTFALL";

export type AlertStatus = "open" | "reviewed" | "dismissed";

export interface ShopRow {
  id: string;
  shop_domain: string;
  access_token_ciphertext: string | null;
  access_token_iv: string | null;
  access_token_tag: string | null;
  token_key_version: number | null;
  encrypted_at: string | null;
  scope: string | null;
  sync_cursor: string | null;
  installed_at: string;
  uninstalled_at: string | null;
  // ── Billing fields (added in Package 2) ────────────────────────
  plan: string | null; // References plan tier (free/starter/growth/pro/enterprise)
  billing_active: boolean; // Whether merchant has active paid subscription
  trial_started_at: string | null; // When free trial began (ISO timestamp)
  trial_ends_at: string | null; // When trial ends/converts to paid (ISO timestamp)
  subscription_id: string | null; // Shopify Subscription ID for reconciliation
  next_billing_at: string | null; // Next billing cycle date (ISO timestamp)
  usage_current_period: number; // Protected orders count in current period
  usage_reset_at: string; // When usage counter resets (typically billing date, ISO timestamp)
  cancelled_at: string | null; // When cancellation was requested (ISO timestamp)
  cancel_effective_at: string | null; // When cancellation takes effect (end of period, ISO timestamp)
}

export interface SettingsRow {
  shop_id: string;
  notification_email: string | null;
  timezone: string;
  alerts_enabled: boolean;
}

export interface RefundAlertRow {
  id: string;
  shop_id: string;
  shopify_refund_id: string;
  shopify_order_id: string;
  order_name: string | null;
  // numeric(12,2) is returned as a string by PostgREST to preserve precision.
  refund_amount: string;
  currency: string;
  money_at_risk: string;
  reason: RefundReason;
  status: AlertStatus;
  refunded_at: string | null;
  detected_at: string;
  reviewed_at: string | null;
  dismissed_at: string | null;
}

// ── M4 sync tables (raw Shopify data the M5 detection engine reads) ────────────
// These hold normalized refund/return facts pulled from Shopify. They are the
// INPUT to detection; `refund_alerts` above is the OUTPUT. numeric(12,2) columns
// come back from PostgREST as strings to preserve precision.

export interface SyncedRefundRow {
  id: string;
  shop_id: string;
  shopify_refund_id: string;
  shopify_order_id: string;
  order_name: string | null;
  refund_amount: string;
  currency: string;
  refunded_at: string | null;
  synced_at: string;
}

export interface SyncedRefundLineItemRow {
  id: string;
  refund_id: string; // FK → synced_refunds.id
  shopify_line_item_id: string | null;
  name: string | null;
  quantity: number;
  subtotal: string;
  restock_type: string | null;
}

export interface SyncedReturnRow {
  id: string;
  shop_id: string;
  shopify_return_id: string;
  shopify_order_id: string;
  name: string | null;
  status: string;
  total_quantity: number;
  synced_at: string;
}

export interface SyncedReturnLineItemRow {
  id: string;
  return_id: string; // FK → synced_returns.id
  shopify_line_item_id: string | null; // the fulfillment line item's LineItem id
  name: string | null;
  quantity: number;
  processed_quantity: number;
  refunded_quantity: number;
}

// ── Billing Event Types ────────────────────────────────────────────────────────

export type BillingEventType =
  | "trial_started"
  | "trial_ended"
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "payment_failed"
  | "payment_succeeded"
  | "usage_limit_warned"
  | "plan_changed"
  | "billing_sync_job_completed"
  | "usage_reset"
  | "subscription_validation"
  | "subscription_validation_failed";

// ── Audit Logging Functions ────────────────────────────────────────────────────

/**
 * Log a billing event for audit and tracking purposes.
 * @param shopId The shop ID
 * @param eventType The type of billing event
 * @param eventData Additional event-specific data
 */
export async function logBillingEvent(
  shopId: string,
  eventType: BillingEventType,
  eventData: Record<string, unknown> = {}
): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from("billing_events")
    .insert({
      shop_id: shopId,
      event_type: eventType,
      event_data: eventData,
    });

  if (error) {
    // Log error but don't throw - we don't want audit logging failures to break core functionality
    console.error(`Failed to log billing event: ${error.message}`);
  }
}

/**
 * Log a subscription created event.
 */
export async function logSubscriptionCreated(
  shopId: string,
  subscriptionId: string,
  test: boolean = false,
  additionalData: Record<string, unknown> = {}
): Promise<void> {
  await logBillingEvent(shopId, "subscription_created", {
    subscription_id: subscriptionId,
    test,
    ...additionalData,
  });
}

/**
 * Log a subscription updated event.
 */
export async function logSubscriptionUpdated(
  shopId: string,
  subscriptionId: string,
  test: boolean = false,
  additionalData: Record<string, unknown> = {}
): Promise<void> {
  await logBillingEvent(shopId, "subscription_updated", {
    subscription_id: subscriptionId,
    test,
    ...additionalData,
  });
}

/**
 * Log a subscription cancelled event.
 */
export async function logSubscriptionCancelled(
  shopId: string,
  subscriptionId: string,
  test: boolean = false,
  additionalData: Record<string, unknown> = {}
): Promise<void> {
  await logBillingEvent(shopId, "subscription_cancelled", {
    subscription_id: subscriptionId,
    test,
    ...additionalData,
  });
}

/**
 * Log a payment failed event.
 */
export async function logPaymentFailed(
  shopId: string,
  additionalData: Record<string, unknown> = {}
): Promise<void> {
  await logBillingEvent(shopId, "payment_failed", additionalData);
}

/**
 * Log a payment succeeded event.
 */
export async function logPaymentSucceeded(
  shopId: string,
  additionalData: Record<string, unknown> = {}
): Promise<void> {
  await logBillingEvent(shopId, "payment_succeeded", additionalData);
}

/**
 * Log a usage limit warned event.
 */
export async function logUsageLimitWarned(
  shopId: string,
  currentUsage: number,
  limit: number,
  additionalData: Record<string, unknown> = {}
): Promise<void> {
  await logBillingEvent(shopId, "usage_limit_warned", {
    current_usage: currentUsage,
    limit: limit,
    ...additionalData,
  });
}

/**
 * Log a plan changed event.
 */
export async function logPlanChanged(
  shopId: string,
  oldPlan: string | null,
  newPlan: string | null,
  additionalData: Record<string, unknown> = {}
): Promise<void> {
  await logBillingEvent(shopId, "plan_changed", {
    old_plan: oldPlan,
    new_plan: newPlan,
    ...additionalData,
  });
}

// ── Client ─────────────────────────────────────────────────────────────────────

let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;

  const env = getEnv();
  cached = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        // Server-to-server only: no user session, no token refresh, no storage.
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return cached;
}