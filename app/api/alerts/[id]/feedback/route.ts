import { NextResponse, type NextRequest } from "next/server";

import { getShopIdFromSession } from "@/lib/auth/session";
import { createFeedback } from "@/lib/dashboard/queries";
import { revalidatePath } from "next/cache";

// Node runtime REQUIRED for node:crypto (session signing).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/alerts/[id]/feedback — submit feedback on an alert.
 *
 * Verifies the alert belongs to the authenticated shop before storing feedback.
 * Caller must be authenticated via the session cookie.
 *
 * Expected JSON body:
 * {
 *   feedbackType: "confirmed" | "false_positive" | "comment",
 *   comment?: string
 * }
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
    const json = await req.json();
    const { feedbackType, comment } = json;

    // Validate feedbackType
    const validTypes = ["confirmed", "false_positive", "comment"];
    if (!feedbackType || !validTypes.includes(feedbackType)) {
      return NextResponse.json(
        { error: "Invalid feedbackType. Must be 'confirmed', 'false_positive', or 'comment'" },
        { status: 400 }
      );
    }

    await createFeedback(shopId, alertId, feedbackType, comment ?? null);
    revalidatePath("/dashboard");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit feedback";
    // Distinguish authorization (not found/access denied) from server errors
    const status =
      message.includes("access denied") ||
      message.includes("not found") ||
      message.includes("Invalid feedbackType") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}