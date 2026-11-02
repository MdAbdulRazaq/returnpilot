import "server-only";

import { getEnv } from "@/lib/env";
import { hmacSha256Hex, safeEqual } from "@/lib/crypto";

/**
 * Lightweight session wrapper around Shopify OAuth.
 *
 * This is NOT a standalone authentication system.
 * It simply binds the authenticated Shopify shop to the browser
 * after OAuth completes, so subsequent requests can identify the shop.
 *
 * Flow:
 *   OAuth callback → set signed HttpOnly cookie → future requests verify cookie → extract shop_id
 *
 * Security:
 *   HttpOnly, Secure, SameSite=LaX, HMAC-signed, expiration enforced.
 *   Invalid/missing cookie → 401. Client-supplied shop_id is never trusted.
 */

export const SHOP_SESSION_COOKIE = "rp_shop_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const SHOP_DOMAIN_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

function signShopDomain(shopDomain: string): string {
  const env = getEnv();
  return hmacSha256Hex(shopDomain, env.SHOPIFY_API_SECRET);
}

function verifyShopDomain(shopDomain: string, signature: string): boolean {
  const expected = signShopDomain(shopDomain);
  return safeEqual(expected, signature);
}

/**
 * Create a signed session value: "shopDomain.signature"
 */
export function createSessionValue(shopDomain: string): string {
  if (!SHOP_DOMAIN_RE.test(shopDomain)) {
    throw new Error("Invalid shop domain");
  }
  const signature = signShopDomain(shopDomain);
  return `${shopDomain}.${signature}`;
}

/**
 * Parse and verify a session cookie value.
 * Returns the shop domain if valid, null otherwise.
 */
export function parseSessionValue(value: string): string | null {
  const parts = value.split(".");
  if (parts.length !== 2) return null;

  const shopDomain = parts[0];
  const signature = parts[1];
  if (!shopDomain || !signature) return null;
  if (!SHOP_DOMAIN_RE.test(shopDomain)) return null;

  if (!verifyShopDomain(shopDomain, signature)) return null;

  return shopDomain;
}

/**
 * Extract shop ID from request cookies.
 * Returns the internal shop UUID if session is valid, null otherwise.
 */
export async function getShopIdFromSession(
  cookies: { get: (name: string) => { value: string } | undefined },
): Promise<string | null> {
  const sessionCookie = cookies.get(SHOP_SESSION_COOKIE);
  if (!sessionCookie?.value) return null;

  const shopDomain = parseSessionValue(sessionCookie.value);
  if (!shopDomain) return null;

  // Look up the shop's internal UUID
  const { getAdminClient } = await import("@/lib/supabase/admin");
  const db = getAdminClient();

  const { data, error } = await db
    .from("shops")
    .select("id")
    .eq("shop_domain", shopDomain)
    .is("uninstalled_at", null)
    .single();

  if (error || !data) return null;

  return data.id;
}

/**
 * Set the session cookie on a response.
 */
export function setSessionCookie(
  res: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } },
  shopDomain: string,
): void {
  const value = createSessionValue(shopDomain);
  res.cookies.set(SHOP_SESSION_COOKIE, value, {
    httpOnly: true,
    secure: getEnv().APP_ENV !== "development",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/**
 * Clear the session cookie.
 */
export function clearSessionCookie(
  res: { cookies: { delete: (name: string) => void } },
): void {
  res.cookies.delete(SHOP_SESSION_COOKIE);
}