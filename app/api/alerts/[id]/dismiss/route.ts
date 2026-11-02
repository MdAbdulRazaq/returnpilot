import { NextResponse, type NextRequest } from "next/server";

import { getShopIdFromSession } from "@/lib/auth/session";
import { dismissAlert } from "@/lib/dashboard/queries";
import { revalidatePath } from "next/cache";

// Node runtime REQUIRED for node:crypto (session signing).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/alerts/[id]/dismiss — mark alert as dismissed.
 *
 * Verifies the alert belongs to the authenticated shop before updating.
 * Caller must be authenticated via the session cookie.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: alertId } = await params;

  const shopId = await getShopIdFromSession(req.cookies);
  if (!shopId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dismissAlert(shopId, alertId);
    revalidatePath("/dashboard");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to dismiss alert";
    const status = message.includes("access denied") || message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}