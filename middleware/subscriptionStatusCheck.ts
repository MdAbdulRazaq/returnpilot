import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient, type ShopRow } from "@/lib/supabase/admin";

/**
 * Middleware to verify subscription status for access control.
 * Blocks requests when subscription is not active or has issues.
 */
export async function subscriptionStatusCheckMiddleware(
  req: NextRequest,
  shopId: string
): Promise<NextResponse | null> {
  const db = getAdminClient();

  // Get shop details including subscription status
  const { data: shop, error } = await db
    .from("shops")
    .select("billing_active, trial_ends_at, cancelled_at, cancel_effective_at, past_due_at")
    .eq("id", shopId)
    .single();

  if (error || !shop) {
    // If we can't get shop info, fail open to avoid blocking legitimate requests
    return null;
  }

  // Check if subscription is actively billing
  if (!shop.billing_active) {
    // Check if in trial
    const trialEndsAt = shop.trial_ends_at ? new Date(shop.trial_ends_at) : null;
    const now = new Date();

    if (trialEndsAt && trialEndsAt > now) {
      // Still in trial, allow access
      return null;
    }

    // Not in trial and not billing active - block access
    return NextResponse.json(
      { error: "Subscription is not active. Please check your billing status." },
      { status: 402 } // Payment Required
    );
  }

  // Check if subscription is past due
  // Note: In a real implementation, we would have a past_due_at field or check payment status
  // For now, we'll rely on the billing_active field being false for past due

  // Subscription is active, allow request
  return null;
}

export default subscriptionStatusCheckMiddleware;