import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getEnv } from "@/lib/env";

/**
 * Shopify webhook authenticity verification.
 *
 * Shopify signs each webhook with HMAC-SHA256 over the EXACT raw request body,
 * keyed by the app's API secret, base64-encoded in the `X-Shopify-Hmac-Sha256`
 * header. We MUST compute the HMAC over the untouched raw bytes — parsing the
 * JSON first and re-serialising would change the bytes and break the signature.
 *
 * A failed check means the payload is untrusted: the caller must reject it and
 * persist nothing.
 */

export const HMAC_HEADER = "x-shopify-hmac-sha256";
export const TOPIC_HEADER = "x-shopify-topic";
export const SHOP_DOMAIN_HEADER = "x-shopify-shop-domain";

// ── Billing Webhook Topics ─────────────────────────────────────────────────────
export const BILLING_WEBHOOK_TOPICS = [
  "APP_SUBSCRIPTIONS_CREATE",
  "APP_SUBSCRIPTIONS_UPDATE",
  "APP_SUBSCRIPTIONS_CANCELLED",
] as const;

export type BillingWebhookTopic = typeof BILLING_WEBHOOK_TOPICS[number];

/**
 * Check if a webhook topic is a billing-related topic.
 */
export function isBillingWebhookTopic(topic: string): topic is BillingWebhookTopic {
  return BILLING_WEBHOOK_TOPICS.includes(topic as BillingWebhookTopic);
}

/**
 * Constant-time verify of a webhook's HMAC over its raw body.
 * @param rawBody the exact bytes of the request body (string or Buffer)
 * @param providedHmac value of the `X-Shopify-Hmac-Sha256` header (base64)
 */
export function verifyWebhookHmac(
  rawBody: string | Buffer,
  providedHmac: string | null | undefined,
): boolean {
  if (!providedHmac) return false;

  const digest = createHmac("sha256", getEnv().SHOPIFY_API_SECRET)
    .update(typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody)
    .digest(); // raw bytes

  let provided: Buffer;
  try {
    provided = Buffer.from(providedHmac, "base64");
  } catch {
    return false;
  }

  // timingSafeEqual requires equal lengths; a length mismatch is already a fail.
  if (provided.length !== digest.length) return false;
  return timingSafeEqual(provided, digest);
}

/**
 * Constant-time verify of a billing webhook's HMAC over its raw body.
 * Uses SHOPIFY_WEBHOOK_SECRET if set, otherwise falls back to SHOPIFY_API_SECRET.
 * @param rawBody the exact bytes of the request body (string or Buffer)
 * @param providedHmac value of the `X-Shopify-Hmac-Sha256` header (base64)
 */
export function verifyBillingWebhookHmac(
  rawBody: string | Buffer,
  providedHmac: string | null | undefined,
): boolean {
  if (!providedHmac) return false;

  const env = getEnv();
  const secret = env.SHOPIFY_WEBHOOK_SECRET ?? env.SHOPIFY_API_SECRET;
  const digest = createHmac("sha256", secret)
    .update(typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody)
    .digest(); // raw bytes

  let provided: Buffer;
  try {
    provided = Buffer.from(providedHmac, "base64");
  } catch {
    return false;
  }

  // timingSafeEqual requires equal lengths; a length mismatch is already a fail.
  if (provided.length !== digest.length) return false;
  return timingSafeEqual(provided, digest);
}