import { NextResponse, type NextRequest } from "next/server";

import {
  verifyWebhookHmac,
  HMAC_HEADER,
  SHOP_DOMAIN_HEADER,
} from "@/lib/shopify/webhooks";
import { isValidShopDomain } from "@/lib/shopify/oauth";
import { getAdminClient, type ShopRow } from "@/lib/supabase/admin";
import { syncOrder } from "@/lib/shopify/sync";

// Node runtime REQUIRED: node:crypto HMAC + AES-GCM token decryption in sync.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/refunds-create — Shopify `refunds/create`.
 *
 * Security order is deliberate: read the RAW body, verify its HMAC BEFORE
 * parsing or trusting any field, then resolve the shop and trigger a single
 * near-real-time order sync. We always return 200 after a verified receipt so
 * Shopify does not retry a payload we've accepted; downstream sync failures are
 * handled by the hourly cron (idempotent), not by forcing webhook retries.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const raw = await req.text(); // raw bytes — do NOT parse before verifying

  if (!verifyWebhookHmac(raw, req.headers.get(HMAC_HEADER))) {
    // Unverified: reject and persist nothing.
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const shopDomain = req.headers.get(SHOP_DOMAIN_HEADER);
  if (!isValidShopDomain(shopDomain)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  let payload: { order_id?: number | string };
  try {
    payload = JSON.parse(raw) as { order_id?: number | string };
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (payload.order_id == null) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const { data: shop, error } = await getAdminClient()
    .from("shops")
    .select("*")
    .eq("shop_domain", shopDomain)
    .is("uninstalled_at", null)
    .single();

  if (error || !shop) {
    // Unknown/uninstalled shop: acknowledge so Shopify stops retrying.
    return NextResponse.json({ ok: true });
  }

  // REST webhook payloads use numeric IDs; the Admin GraphQL API needs a GID.
  const gid = `gid://shopify/Order/${payload.order_id}`;
  try {
    await syncOrder(shop as ShopRow, gid);
  } catch {
    // Verified receipt already acknowledged; hourly cron will reconcile.
    console.error("refunds/create: sync failed after verified webhook");
  }

  return NextResponse.json({ ok: true });
}
