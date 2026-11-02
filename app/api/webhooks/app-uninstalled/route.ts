import { NextResponse, type NextRequest } from "next/server";

import {
  verifyWebhookHmac,
  HMAC_HEADER,
  SHOP_DOMAIN_HEADER,
} from "@/lib/shopify/webhooks";
import { isValidShopDomain } from "@/lib/shopify/oauth";
import { getAdminClient } from "@/lib/supabase/admin";

// Node runtime REQUIRED for node:crypto HMAC verification.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/app-uninstalled — Shopify `app/uninstalled`.
 *
 * When a merchant uninstalls, their offline token is revoked by Shopify and is
 * now useless to us. We verify the webhook, then mark the shop uninstalled and
 * NULL the encrypted-token columns so we neither retain nor attempt to use dead
 * credentials. Idempotent: repeated deliveries converge to the same state.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const raw = await req.text(); // raw bytes — verify before trusting

  if (!verifyWebhookHmac(raw, req.headers.get(HMAC_HEADER))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const shopDomain = req.headers.get(SHOP_DOMAIN_HEADER);
  if (!isValidShopDomain(shopDomain)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const { error } = await getAdminClient()
    .from("shops")
    .update({
      uninstalled_at: new Date().toISOString(),
      access_token_ciphertext: null,
      access_token_iv: null,
      access_token_tag: null,
      token_key_version: null,
      encrypted_at: null,
    })
    .eq("shop_domain", shopDomain);

  if (error) {
    console.error("app/uninstalled: failed to clear shop token");
    // Still 200: Shopify retries are pointless; hourly job won't touch a shop
    // whose token is gone, and a later delivery will retry the clear.
  }

  return NextResponse.json({ ok: true });
}
