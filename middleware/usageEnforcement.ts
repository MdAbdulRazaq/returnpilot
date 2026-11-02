import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient, type ShopRow } from "@/lib/supabase/admin";
import { limitEvaluator } from "@/lib/usage/limitEvaluator";

/**
 * Middleware to enforce plan limits based on protected orders usage.
 * Blocks requests when usage exceeds plan limits (with grace period).
 */
export async function usageEnforcementMiddleware(
  req: NextRequest,
  shopId: string
): Promise<NextResponse | null> {
  const db = getAdminClient();

  // Get shop details including current usage and plan
  const { data: shop, error } = await db
    .from("shops")
    .select("plan, usage_current_period, usage_reset_at, billing_active")
    .eq("id", shopId)
    .single();

  if (error || !shop) {
    // If we can't get shop info, fail open to avoid blocking legitimate requests
    return null;
  }

  // If not billing active, no enforcement needed
  if (!shop.billing_active) {
    return null;
  }

  // Get the plan limit for this shop's plan
  const limit = limitEvaluator.getPlanLimit(shop.plan);

  // If limit is undefined (unknown plan), fail open
  if (limit === undefined) {
    return null;
  }

  // Check if usage exceeds limit (with 10% grace period)
  const usage = shop.usage_current_period ?? 0;
  const gracePeriodLimit = limit * 1.1; // 10% grace period

  if (usage > gracePeriodLimit) {
    // Block the request - usage has exceeded grace period
    return NextResponse.json(
      { error: "Usage limit exceeded. Please upgrade your plan to continue." },
      { status: 402 } // Payment Required
    );
  }

  // Usage is within limits (including grace period), allow request
  return null;
}

export default usageEnforcementMiddleware;