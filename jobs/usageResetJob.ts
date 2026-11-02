import { getAdminClient, type ShopRow } from "@/lib/supabase/admin";
import { logBillingEvent, BillingEventType } from "@/lib/supabase/admin";

/**
 * Background job to reset usage counters at billing cycle boundaries.
 * This job should be scheduled to run periodically (e.g., hourly) and
 * will reset usage for shops whose billing cycle has reset.
 */
export async function usageResetJob(): Promise<void> {
  const db = getAdminClient();
  const now = new Date();

  try {
    // Get all shops that have a usage_reset_at set and need to be checked
    const { data: shops, error } = await db
      .from("shops")
      .select("id, usage_current_period, usage_reset_at, plan")
      .not("usage_reset_at", "is", null)
      .not("usage_current_period", "eq", 0)
      .returns<Pick<ShopRow, "id" | "usage_current_period" | "usage_reset_at" | "plan">[]>();

    if (error) {
      throw new Error(`Failed to fetch shops for usage reset: ${error.message}`);
    }

    let resetCount = 0;

    for (const shop of shops) {
      const resetAt = new Date(shop.usage_reset_at);

      // Check if the usage reset time has passed
      // We compare dates (ignoring time) to determine if a new billing period has started
      const resetDate = new Date(resetAt.toDateString());
      const nowDate = new Date(now.toDateString());

      if (nowDate > resetDate) {
        // Calculate the new reset date (typically 1 month later)
        // In a real implementation, this would be based on the actual billing cycle
        const newResetAt = new Date(resetAt);
        newResetAt.setMonth(newResetAt.getMonth() + 1);

        // Reset the usage counter
        const { error: updateError } = await db
          .from("shops")
          .update({
            usage_current_period: 0,
            usage_reset_at: newResetAt.toISOString()
          })
          .eq("id", shop.id);

        if (updateError) {
          console.error(`Failed to reset usage for shop ${shop.id}:`, updateError);
          continue;
        }

        resetCount++;

        // Log the usage reset event
        await logBillingEvent(shop.id, "usage_reset", {
          previousPeriodUsage: shop.usage_current_period,
          plan: shop.plan,
          resetAt: newResetAt.toISOString(),
          resetCount: 1
        });

        console.log(`Reset usage for shop ${shop.id} (plan: ${shop.plan})`);
      }
    }

    console.log(`Usage reset job completed. Reset ${resetCount} shops.`);
  } catch (error) {
    console.error("Usage reset job failed:", error);
    throw error;
  }
}

export default usageResetJob;