import "server-only";

import { randomBytes } from "node:crypto";

import { getEnv } from "@/lib/env";
import { hmacSha256Hex, safeEqual } from "@/lib/crypto";

/**
 * Shopify OAuth primitives: shop-domain validation, HMAC verification, and the
 * anti-CSRF `state` value. Kept free of framework/request types so each piece is
 * unit-testable in isolation.
 */

export const STATE_COOKIE = "rp_oauth_state";
export const STATE_TTL_SECONDS = 600; // 10 minutes — short window limits replay.

/**
 * A shop domain is trusted ONLY if it matches `<store>.myshopify.com` exactly.
 * WHY: `shop` is attacker-controlled and is later used to build the Shopify
 * authorize URL and API base URL. Without this allowlist an attacker could point
 * us at their own host (SSRF) or craft an open-redirect. Anchored regex, lowercase
 * only, no ports, no paths, no userinfo.
 */
const SHOP_DOMAIN_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

export function isValidShopDomain(shop: unknown): shop is string {
  return typeof shop === "string" && shop.length <= 100 && SHOP_DOMAIN_RE.test(shop);
}

/**
 * Verify the OAuth `hmac` query parameter per Shopify's documented process:
 *   1. Remove `hmac` (and legacy `signature`) from the query params.
 *   2. Sort the remaining params lexicographically by key.
 *   3. Join as `key=value` pairs with `&`.
 *   4. HMAC-SHA256 that string with the app's client secret.
 *   5. Constant-time compare the hex digest to the received `hmac`.
 * WHY: proves the callback genuinely came from Shopify and that no parameter
 * (including `shop`) was altered in transit. Step 5 is constant-time to prevent
 * a timing side channel from leaking the correct digest.
 */
export function verifyOAuthHmac(params: URLSearchParams): boolean {
  const provided = params.get("hmac");
  if (!provided) return false;

  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hmac" || key === "signature") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const message = pairs.join("&");

  const expected = hmacSha256Hex(message, getEnv().SHOPIFY_API_SECRET);
  return safeEqual(expected, provided);
}

/** Cryptographically-random state nonce (CSRF token) for one OAuth attempt. */
export function generateState(): string {
  return randomBytes(16).toString("hex");
}

/** Confirm the callback's `state` matches the one we issued (constant-time). */
export function verifyState(cookieState: unknown, queryState: unknown): boolean {
  if (typeof cookieState !== "string" || typeof queryState !== "string") return false;
  if (cookieState.length === 0) return false;
  return safeEqual(cookieState, queryState);
}

/** Build Shopify's authorize URL. `shop` MUST already be validated. */
export function buildAuthorizeUrl(shop: string, state: string): string {
  const env = getEnv();
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", env.SHOPIFY_API_KEY);
  url.searchParams.set("scope", env.SHOPIFY_SCOPES);
  url.searchParams.set("redirect_uri", `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`);
  url.searchParams.set("state", state);
  // Offline token: a long-lived token for background sync, per project decision.
  url.searchParams.set("grant_options[]", "");
  return url.toString();
}

/** Exchange an authorization code for an OFFLINE access token. */
export async function exchangeCodeForToken(
  shop: string,
  code: string,
): Promise<{ accessToken: string; scope: string }> {
  const env = getEnv();
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.SHOPIFY_API_KEY,
      client_secret: env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!res.ok) {
    // Do not surface Shopify's response body — it may aid an attacker.
    throw new Error("Token exchange failed.");
  }

  const data = (await res.json()) as { access_token?: string; scope?: string };
  if (!data.access_token) {
    throw new Error("Token exchange returned no access token.");
  }
  return { accessToken: data.access_token, scope: data.scope ?? "" };
}
