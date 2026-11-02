import { NextResponse, type NextRequest } from "next/server";

import {
  verifyBillingWebhookHmac,
  HMAC_HEADER,
  TOPIC_HEADER,
  SHOP_DOMAIN_HEADER,
  isBillingWebhookTopic,
} from "@/lib/shopify/webhooks";
import { isValidShopDomain } from "@/lib/shopify/oauth";
import {
  getAdminClient,
  type ShopRow,
  logSubscriptionCreated,
  logSubscriptionUpdated,
  logSubscriptionCancelled,
} from "@/lib/supabase/admin";

// Node runtime REQUIRED: node:crypto HMAC + AES-GCM token decryption potential usage.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/shopify-billing/[...] — Shopify billing webhooks.
 *
 * Handles APP_SUBSCRIPTIONS_CREATE, APP_SUBSCRIPTIONS_UPDATE, and
 * APP_SUBSCRIPTIONS_CANCELLED webhooks from Shopify.
 *
 * Security order: read RAW body, verify HMAC, validate topic and shop domain,
 * then update shop billing records and log billing events.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const raw = await req.text(); // raw bytes — do NOT parse before verifying

  const hmacHeader = req.headers.get(HMAC_HEADER);
  const topicHeader = req.headers.get(TOPIC_HEADER);
  const shopDomain = req.headers.get(SHOP_DOMAIN_HEADER);

  // Verify webhook authenticity using billing-webhook-specific secret
  if (!verifyBillingWebhookHmac(raw, hmacHeader)) {
    // Unverified: reject and persist nothing.
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Validate shop domain
  if (!isValidShopDomain(shopDomain)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // Check if this is a billing webhook topic
  if (!topicHeader || !isBillingWebhookTopic(topicHeader)) {
    // Not a billing webhook we handle: acknowledge but don't process
    return NextResponse.json({ ok: true });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // Look up shop in database
  const { data: shop, error: shopError } = await getAdminClient()
    .from("shops")
    .select("*")
    .eq("shop_domain", shopDomain)
    .is("uninstalled_at", null)
    .single();

  if (shopError || !shop) {
    // Unknown/uninstalled shop: acknowledge so Shopify stops retrying.
    return NextResponse.json({ ok: true });
  }

  // Extract subscription ID and test flag from payload
  const subscriptionId = (payload as { id?: string; admin_graphql_api_id?: string }).id ?? (payload as { admin_graphql_api_id?: string }).admin_graphql_api_id ?? '';
  const test = (payload as { test?: boolean }).test ?? false;

  // Process based on webhook topic
  try {
    switch (topicHeader) {
      case "APP_SUBSCRIPTIONS_CREATE":
        await handleSubscriptionCreated(shop as ShopRow, payload, subscriptionId, test);
        break;
      case "APP_SUBSCRIPTIONS_UPDATE":
        await handleSubscriptionUpdated(shop as ShopRow, payload, subscriptionId, test);
        break;
      case "APP_SUBSCRIPTIONS_CANCELLED":
        await handleSubscriptionCancelled(shop as ShopRow, payload, subscriptionId, test);
        break;
      default:
        // Should not happen due to isBillingWebhookTopic check, but be safe
        return NextResponse.json({ ok: true });
    }
  } catch (error) {
    // Log error but still acknowledge webhook to prevent retries
    console.error(`shopify-billing/webhook: Error processing ${topicHeader}:`, error);
    // Return 200 so Shopify doesn't retry
    return NextResponse.json({ ok: true });
  }

  // Acknowledge receipt so Shopify doesn't retry
  return NextResponse.json({ ok: true });
}

/**
 * Handle subscription creation webhook.
 */
async function handleSubscriptionCreated(
  shop: ShopRow,
  payload: unknown,
  subscriptionId: string,
  test: boolean
): Promise<void> {
  const supabase = getAdminClient();

  // Extract subscription details from payload
  const name = (payload as { name?: string | null }).name ?? null;
  const status = (payload as { status?: string | null }).status ?? null;
  // Note: Shopify doesn't directly send plan name in webhook, we may need to query
  // For foundation, we'll store what we can and update plan via sync or settings

  // Update shop with subscription information
  const { error: updateError } = await supabase
    .from("shops")
    .update({
      subscription_id: subscriptionId,
      // For foundation, we don't set plan/billing_active here - those come from
      // settings or sync processes that have the full context
      // We set billing_active based on status if we can determine it
      billing_active: status === "ACTIVE",
      // Update timestamps if provided
      trial_started_at: (payload as { trial_start?: string | null }).trial_start ?? null,
      trial_ends_at: (payload as { trial_ends?: string | null }).trial_ends ?? null,
      next_billing_at: (payload as { next_billing_date?: string | null }).next_billing_date ?? null,
    })
    .eq("id", shop.id);

  if (updateError) {
    throw updateError;
  }

  // Log billing event using audit logging function
  await logSubscriptionCreated(shop.id, subscriptionId, test, {
    name: name,
    status: status,
    ...(payload as Record<string, unknown>),
  });
}

/**
 * Handle subscription update webhook.
 */
async function handleSubscriptionUpdated(
  shop: ShopRow,
  payload: unknown,
  subscriptionId: string,
  test: boolean
): Promise<void> {
  const supabase = getAdminClient();

  // Extract subscription details from payload
  const name = (payload as { name?: string | null }).name ?? null;
  const status = (payload as { status?: string | null }).status ?? null;

  // Update shop with subscription information
  const { error: updateError } = await supabase
    .from("shops")
    .update({
      subscription_id: subscriptionId,
      billing_active: status === "ACTIVE",
      // Update timestamps if provided
      trial_started_at: (payload as { trial_start?: string | null }).trial_start ?? null,
      trial_ends_at: (payload as { trial_ends?: string | null }).trial_ends ?? null,
      next_billing_at: (payload as { next_billing_date?: string | null }).next_billing_date ?? null,
      // For plan updates, we would need to determine the new plan from payload
      // This would require querying Shopify or having plan info in the webhook
      // For foundation, we leave plan updates to the sync process or settings
    })
    .eq("id", shop.id);

  if (updateError) {
    throw updateError;
  }

  // Log billing event using audit logging function
  await logSubscriptionUpdated(shop.id, subscriptionId, test, {
    name: name,
    status: status,
    ...(payload as Record<string, unknown>),
  });
}

/**
 * Handle subscription cancellation webhook.
 */
async function handleSubscriptionCancelled(
  shop: ShopRow,
  payload: unknown,
  subscriptionId: string,
  test: boolean
): Promise<void> {
  const supabase = getAdminClient();

  // Extract subscription details from payload
  // Note: For cancellation, we don't need to extract name/status for the shop update
  // but we still need them for the log if desired.

  // Update shop with cancellation information
  const { error: updateError } = await supabase
    .from("shops")
    .update({
      subscription_id: subscriptionId,
      billing_active: false,
      cancelled_at: new Date().toISOString(),
      cancel_effective_at: (payload as { cancelled_at?: string | null }).cancelled_at ?? null,
    })
    .eq("id", shop.id);

  if (updateError) {
    throw updateError;
  }

  // Log billing event using audit logging function
  await logSubscriptionCancelled(shop.id, subscriptionId, test, {
    ...(payload as Record<string, unknown>),
  });
}