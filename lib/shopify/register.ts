import "server-only";

import { getEnv } from "@/lib/env";
import {
  shopifyGraphQL,
  type ShopApiContext,
  ShopifyApiError,
} from "@/lib/shopify/graphql";
import {
  WEBHOOK_SUBSCRIPTION_CREATE,
  type WebhookCreateResponse,
} from "@/lib/shopify/queries";

/**
 * Idempotent webhook registration.
 *
 * M3's frozen OAuth callback does not register webhooks, so we ensure them here,
 * in the sync path. Registering a topic that already exists returns a benign
 * "already taken / exists" userError from Shopify — we treat that as success, so
 * calling this repeatedly (every sync) is safe and cheap.
 *
 * All Shopify traffic goes through `lib/shopify/graphql.ts` per the M4 rule.
 */

// The two detection-relevant topics. GDPR/compliance webhooks are deferred
// (see docs/DECISIONS.md) and are intentionally NOT registered here.
const TOPICS = [
  "REFUNDS_CREATE",
  "APP_UNINSTALLED",
  "APP_SUBSCRIPTIONS_CREATE",
  "APP_SUBSCRIPTIONS_UPDATE",
  "APP_SUBSCRIPTIONS_CANCELLED",
] as const;

// Map each topic to the route that handles its inbound POST.
const CALLBACK_PATH: Record<(typeof TOPICS)[number], string> = {
  REFUNDS_CREATE: "/api/webhooks/refunds-create",
  APP_UNINSTALLED: "/api/webhooks/app-uninstalled",
  APP_SUBSCRIPTIONS_CREATE: "/api/webhooks/shopify-billing",
  APP_SUBSCRIPTIONS_UPDATE: "/api/webhooks/shopify-billing",
  APP_SUBSCRIPTIONS_CANCELLED: "/api/webhooks/shopify-billing",
};

/** True if a userError just means the subscription already exists. */
function isAlreadyExists(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("already") || m.includes("taken") || m.includes("exists");
}

/**
 * Ensure both webhook subscriptions exist for this shop. Never throws for the
 * "already registered" case; only genuine failures propagate.
 */
export async function ensureWebhooksRegistered(
  ctx: ShopApiContext,
): Promise<void> {
  const { NEXT_PUBLIC_APP_URL } = getEnv();

  for (const topic of TOPICS) {
    const callbackUrl = `${NEXT_PUBLIC_APP_URL}${CALLBACK_PATH[topic]}`;
    const data = await shopifyGraphQL<WebhookCreateResponse>(
      ctx,
      WEBHOOK_SUBSCRIPTION_CREATE,
      { topic, callbackUrl },
    );

    const errors = data.webhookSubscriptionCreate.userErrors;
    if (errors.length === 0) continue;

    // Tolerate "already exists"; surface anything else.
    const fatal = errors.filter((e) => !isAlreadyExists(e.message));
    if (fatal.length > 0) {
      throw new ShopifyApiError(
        `Webhook registration failed for ${topic}: ${fatal
          .map((e) => e.message)
          .join("; ")}`,
        false,
      );
    }
  }
}