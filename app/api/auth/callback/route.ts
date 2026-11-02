import { NextResponse, type NextRequest } from "next/server";

import {
  STATE_COOKIE,
  exchangeCodeForToken,
  isValidShopDomain,
  verifyOAuthHmac,
  verifyState,
} from "@/lib/shopify/oauth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { encryptToken } from "@/lib/crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { getEnv } from "@/lib/env";
import { setSessionCookie } from "@/lib/auth/session";

// Node runtime REQUIRED for node:crypto (HMAC + AES-GCM).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/callback — finish Shopify OAuth.
 *
 * Order of checks is deliberate (cheapest / most-suspicious first):
 *   rate limit → shop allowlist → HMAC (authenticity) → state (CSRF) →
 *   token exchange → encrypt & persist.
 * EVERY failure returns the SAME generic error and status so an attacker cannot
 * learn whether the HMAC, the state, or the exchange was what failed. We never
 * log the token, hmac, key, or any customer data.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const env = getEnv();

  if (!rateLimit(`auth-cb:${clientIp(req.headers)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const params = req.nextUrl.searchParams;
  const shop = params.get("shop");
  const code = params.get("code");
  const queryState = params.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;

  // A single generic failure response reused everywhere below.
  const fail = () => {
    const res = NextResponse.json({ error: "Authentication failed." }, { status: 400 });
    res.cookies.delete(STATE_COOKIE); // one-time use: always burn the nonce
    return res;
  };

  if (!isValidShopDomain(shop) || !code) return fail();
  if (!verifyOAuthHmac(params)) return fail();
  if (!verifyState(cookieState, queryState)) return fail();

  let sealed;
  let scope: string;
  try {
    const result = await exchangeCodeForToken(shop, code);
    scope = result.scope;
    sealed = encryptToken(result.accessToken); // plaintext token never leaves this scope
  } catch {
    return fail();
  }

  // Upsert the shop with the encrypted token. Parameterized via supabase-js.
  const { error } = await getAdminClient()
    .from("shops")
    .upsert(
      {
        shop_domain: shop,
        access_token_ciphertext: sealed.ciphertext,
        access_token_iv: sealed.iv,
        access_token_tag: sealed.tag,
        token_key_version: sealed.keyVersion,
        encrypted_at: new Date().toISOString(),
        scope,
        uninstalled_at: null, // re-install clears any prior uninstall marker
      },
      { onConflict: "shop_domain" },
    );

  if (error) {
    // Log a non-sensitive marker only; never the token or DB row contents.
    console.error("shop upsert failed during OAuth callback");
    return fail();
  }

  // Success: set session cookie and redirect to dashboard.
  const res = NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/dashboard`);
  res.cookies.delete(STATE_COOKIE);
  setSessionCookie(res, shop!);
  return res;
}
