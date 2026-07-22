// Usage warnings notification system
// Based on PRICE-007: Send notifications at 80% and 95% of usage limit (email and in-app banner)

import { getTierById } from "@/lib/pricing/tiers";
import { getAdminClient } from "@/lib/supabase/admin";

// In a real implementation, these would be imported from actual notification services
// For this implementation, we'll define the logic and leave actual sending to be implemented

export interface UsageWarning {
  type: "usage_warning";
  threshold: number; // 80 or 95 (percentage)
  currentUsage: number;
  limit: number;
  percentageUsed: number;
  shopId: string;
  timestamp: string; // ISO timestamp
}

/**
 * Check if a usage warning should be triggered
 * @param tierId The pricing tier ID
 * @param currentUsage The current usage count
 * @returns Object indicating if warnings should be sent and which ones
 */
export function checkUsageWarnings(tierId: string, currentUsage: number): {
  warning80: boolean;
  warning95: boolean;
  usage: number;
  limit: number;
  percentageUsed: number;
} {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown pricing tier: ${tierId}`);
  }

  const limit = tier.protectedOrdersLimit;
  const percentageUsed = (currentUsage / limit) * 100;

  const warning80 = percentageUsed >= 80 && percentageUsed < 95;
  const warning95 = percentageUsed >= 95;

  return {
    warning80,
    warning95,
    usage: currentUsage,
    limit,
    percentageUsed: Math.round(percentageUsed * 10) / 10 // Round to 1 decimal place
  };
}

/**
 * Send usage warning notifications (80% and 95% thresholds)
 * In a real implementation, this would connect to email and in-app notification systems
 * @param shopId The shop ID
 * @param tierId The pricing tier ID
 * @param currentUsage The current usage count
 * @returns Object indicating what notifications were sent
 */
export async function sendUsageWarnings(
  shopId: string,
  tierId: string,
  currentUsage: number
): Promise<{
  notificationsSent: UsageWarning[];
  errors: Array<{ type: string; error: string }>;
}> {
  const db = getAdminClient();
  const warnings = checkUsageWarnings(tierId, currentUsage);
  const notificationsSent: UsageWarning[] = [];
  const errors: Array<{ type: string; error: string }> = [];

  try {
    // Get shop information for personalization
    const { data: shop, error: shopError } = await db
      .from("shops")
      .select("shop_domain")
      .eq("id", shopId)
      .single();

    if (shopError) {
      throw shopError;
    }

    const shopDomain = shop?.shop_domain || "unknown";

    // Send 80% warning if triggered
    if (warnings.warning80) {
      try {
        // In a real implementation, this would call:
        // - email service to send 80% warning email
        // - in-app notification service to show banner
        // For this implementation, we'll log what would be sent
        console.log(`[USAGE WARNING 80%] Shop ${shopDomain} (${shopId}) has used ${warnings.usage}/${warnings.limit} protected orders (${warnings.percentageUsed}%)`);

        notificationsSent.push({
          type: "usage_warning",
          threshold: 80,
          currentUsage: warnings.usage,
          limit: warnings.limit,
          percentageUsed: warnings.percentageUsed,
          shopId,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        errors.push({ type: "usage_warning_80", error: err instanceof Error ? err.message : String(err) });
      }
    }

    // Send 95% warning if triggered
    if (warnings.warning95) {
      try {
        // In a real implementation, this would call:
        // - email service to send 95% warning email
        // - in-app notification service to show urgent banner
        // For this implementation, we'll log what would be sent
        console.log(`[USAGE WARNING 95%] Shop ${shopDomain} (${shopId}) has used ${warnings.usage}/${warnings.limit} protected orders (${warnings.percentageUsed}%) - URGENT`);

        notificationsSent.push({
          type: "usage_warning",
          threshold: 95,
          currentUsage: warnings.usage,
          limit: warnings.limit,
          percentageUsed: warnings.percentageUsed,
          shopId,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        errors.push({ type: "usage_warning_95", error: err instanceof Error ? err.message : String(err) });
      }
    }
  } catch (err) {
    errors.push({ type: "usage_warning_check", error: err instanceof Error ? err.message : String(err) });
  }

  return {
    notificationsSent,
    errors
  };
}

/**
 * Check if a shop is eligible for usage warnings (has a valid tier)
 * @param shopId The shop ID
 * @returns Boolean indicating if shop is eligible for usage warnings
 */
export async function isEligibleForUsageWarnings(shopId: string): Promise<boolean> {
  const db = getAdminClient();

  try {
    const { data: shop, error } = await db
      .from("shops")
      .select("plan")
      .eq("id", shopId)
      .single();

    if (error || !shop) {
      return false;
    }

    // Only shops with an active plan (not on trial without conversion) should get usage warnings
    // Shops on trial that haven't converted would get trial warnings instead
    // For simplicity, we'll check if they have a plan set
    return !!shop.plan;
  } catch (_err) {
    return false;
  }
}

/**
 * Get the description of a warning threshold for display purposes
 * @param threshold The threshold percentage (80 or 95)
 * @returns Human-readable description
 */
export function getWarningDescription(threshold: number): string {
  return `${threshold}% of monthly protected orders limit reached`;
}

/**
 * Get the recommended action for a warning threshold
 * @param threshold The threshold percentage (80 or 95)
 * @returns Recommended action string
 */
export function getWarningAction(threshold: number): string {
  if (threshold === 80) {
    return "Consider upgrading your plan to avoid potential service interruptions";
  } else if (threshold === 95) {
    return "Upgrade your plan immediately to prevent new protection processing from being blocked";
  }
  return "Review your usage and consider plan options";
}