// Usage reset scheduler for monthly boundaries
// Based on PRICE-009: Reset usage counters at midnight UTC on first day of each calendar month

import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Reset usage counters for all shops at monthly boundary
 * This function should be called by a scheduled job (e.g., cron job) at midnight UTC on the first of each month
 * @returns Object with results of the reset operation
 */
export async function resetUsageCounters(): Promise<{
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ shopId: string; error: string }>;
  timestamp: string;
}> {
  const db = getAdminClient();
  const now = new Date();
  const timestamp = now.toISOString();

  // Reset usage counter to 0 and update usage_reset_at to today
  // According to PRICE-009, reset happens at midnight UTC on first day of each calendar month
  const { data: shops, error: fetchError } = await db
    .from("shops")
    .select("id")
    .not("plan", "is", null); // Only reset for shops that have a plan (not null)

  if (fetchError) {
    return {
      success: false,
      processedCount: 0,
      failedCount: 0,
      errors: [{ shopId: "unknown", error: fetchError.message }],
      timestamp
    };
  }

  const processedCount = shops.length;
  const errors: Array<{ shopId: string; error: string }> = [];

  // Process each shop
  for (const shop of shops) {
    try {
      const { error: updateError } = await db
        .from("shops")
        .update({
          usage_current_period: 0, // Reset counter to zero
          usage_reset_at: now.toISOString() // Record when reset occurred
        })
        .eq("id", shop.id);

      if (updateError) {
        errors.push({ shopId: shop.id, error: updateError.message });
      }
    } catch (err) {
      errors.push({
        shopId: shop.id,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  return {
    success: errors.length === 0,
    processedCount,
    failedCount: errors.length,
    errors,
    timestamp
  };
}

/**
 * Reset usage counter for a specific shop
 * Useful for testing or manual reset
 * @param shopId The shop ID to reset
 * @returns Object with results of the reset operation
 */
export async function resetUsageCounterForShop(shopId: string): Promise<{
  success: boolean;
  shopId: string;
  error: string | null;
  timestamp: string;
}> {
  const db = getAdminClient();
  const now = new Date();
  const timestamp = now.toISOString();

  try {
    const { error } = await db
      .from("shops")
      .update({
        usage_current_period: 0,
        usage_reset_at: now.toISOString()
      })
      .eq("id", shopId);

    return {
      success: !error,
      shopId,
      error: error ? error.message : null,
      timestamp
    };
  } catch (err) {
    return {
      success: false,
      shopId,
      error: err instanceof Error ? err.message : String(err),
      timestamp
    };
  }
}

/**
 * Get the next reset date (first day of next month at midnight UTC)
 * @returns Date object representing the next reset time
 */
export function getNextResetDate(): Date {
  const now = new Date();
  const nextMonth = new Date(now);

  // Move to first day of next month
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(0, 0, 0, 0); // Midnight UTC

  return nextMonth;
}

/**
 * Get the last reset date (first day of current month at midnight UTC)
 * @returns Date object representing the last reset time
 */
export function getLastResetDate(): Date {
  const now = new Date();
  const currentMonth = new Date(now);

  // Move to first day of current month
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0); // Midnight UTC

  return currentMonth;
}

/**
 * Check if today is a reset day (first day of month)
 * @returns Boolean indicating if today is the first day of the month
 */
export function isResetDay(): boolean {
  const now = new Date();
  return now.getDate() === 1; // First day of month
}

/**
 * Get milliseconds until next reset (for scheduling purposes)
 * @returns Number of milliseconds until next reset time
 */
export function getMsUntilNextReset(): number {
  const now = new Date();
  const nextReset = getNextResetDate();
  return nextReset.getTime() - now.getTime();
}