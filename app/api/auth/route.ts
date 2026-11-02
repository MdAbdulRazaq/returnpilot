import { NextResponse, type NextRequest } from "next/server";

import {
  STATE_COOKIE,
  STATE_TTL_SECONDS,
  buildAuthorizeUrl,
  generateState,
  isValidShopDomain,
} from "@/lib/shopify/oauth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";

// Node runtime is REQUIRED: OAuth/token crypto uses node:crypto, not available on Edge.
export const runtime = "nodejs";
// Never cache an auth handler.
export const dynamic = "force-dynamic";

/**
 * GET /api/auth?shop=<store>.myshopify.com — start Shopify OAuth.
 *
 * Security posture:
 *  - `shop` is validated against the *.myshopify.com allowlist BEFORE use
 *    (SSRF / open-redirect prevention).
 *  - A random `state` nonce is issued and stored in an HttpOnly, Secure,
 *    SameSite=Lax, short-lived cookie (CSRF prevention).
 *  - Rate-limited per IP (best-effort, see lib/rate-limit).
 *  - On any bad input we return a single generic error — we never explain which
 *    check failed.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const env = getEnv();

  // Rate limit first so malformed floods are cheap to reject.
  if (!rateLimit(`auth:${clientIp(req.headers)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const shop = req.nextUrl.searchParams.get("shop");
  if (!isValidShopDomain(shop)) {
    // Generic message — do not confirm/deny the shop's existence or format.
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const state = generateState();
  const res = NextResponse.redirect(buildAuthorizeUrl(shop, state));

  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true, // not readable by JS → mitigates XSS-based theft
    secure: env.APP_ENV !== "development", // HTTPS-only outside local dev
    sameSite: "lax", // sent on top-level redirect back from Shopify, blocks cross-site POST CSRF
    path: "/",
    maxAge: STATE_TTL_SECONDS, // short window limits replay
  });

  return res;
}
