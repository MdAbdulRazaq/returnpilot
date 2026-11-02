import { NextResponse, type NextRequest } from "next/server";

import { getEnv } from "@/lib/env";
import { getAdminClient, type ShopRow } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/crypto";
import { syncShop } from "@/lib/shopify/sync";

// Node runtime REQUIRED (node:crypto via token decryption + safeEqual).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // sync can page several shops

/**
 * GET /api/sync — hourly cron entry point.
 *
 * Auth: a constant-time-checked `Authorization: Bearer <CRON_SECRET>`. Vercel
 * Cron sends this header; without it we reject. This endpoint is not for humans.
 *
 * Iterates every active (installed, not uninstalled) shop and runs a full sync.
 * One shop's failure is logged and skipped so it can't stall the others.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { CRON_SECRET } = getEnv();

  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${CRON_SECRET}`;
  if (!safeEqual(auth, expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: shops, error } = await getAdminClient()
    .from("shops")
    .select("*")
    .is("uninstalled_at", null)
    .not("access_token_ciphertext", "is", null);

  if (error) {
    console.error("sync: failed to list shops");
    return NextResponse.json({ error: "Sync failed." }, { status: 500 });
  }

  let ok = 0;
  let failed = 0;
  for (const shop of (shops ?? []) as ShopRow[]) {
    try {
      await syncShop(shop);
      ok++;
    } catch {
      // Never log token/PII; a generic per-shop marker only.
      console.error(`sync: shop ${shop.id} failed`);
      failed++;
    }
  }

  return NextResponse.json({ ok, failed });
}
