/**
 * Module to evaluate plan limits based on protected orders usage.
 * Provides functions to get plan limits and check usage against those limits.
 */

/**
 * Gets the protected orders limit for a given plan tier.
 * @param plan The plan tier (free, starter, growth, pro, enterprise)
 * @returns The monthly protected orders limit for the plan, or undefined if plan is unknown
 */
export function getPlanLimit(plan: string | null): number | undefined {
  if (!plan) return undefined;

  const planLower = plan.toLowerCase();

  // Plan limits based on docs/product/billing.md Section 5 (Pricing Strategy)
  switch (planLower) {
    case "free":
      return 50;
    case "starter":
      return 200;
    case "growth":
      return 1000;
    case "pro":
      return 5000;
    case "enterprise":
      // Enterprise is custom, but we'll use a large default value
      // In a real implementation, this would be looked up per shop
      return 50000; // 50k as a placeholder for enterprise
    default:
      return undefined;
  }
}

/**
 * Checks if the current usage is within the plan limit (including grace period).
 * @param plan The plan tier
 * @param usageCurrentPeriod The current period usage
 * @returns True if usage is within limits (including grace period), false otherwise
 */
export function isUsageWithinLimit(
  plan: string | null,
  usageCurrentPeriod: number
): boolean {
  const limit = getPlanLimit(plan);
  if (limit === undefined) {
    // If we can't determine the limit, fail open to avoid blocking legitimate usage
    return true;
  }

  // Check against limit with 10% grace period
  const gracePeriodLimit = limit * 1.1;
  return usageCurrentPeriod <= gracePeriodLimit;
}

/**
 * Gets the percentage of usage limit used.
 * @param plan The plan tier
 * @param usageCurrentPeriod The current period usage
 * @returns The percentage of limit used (0-100+), or 0 if plan is unknown
 */
export function getUsagePercentage(
  plan: string | null,
  usageCurrentPeriod: number
): number {
  const limit = getPlanLimit(plan);
  if (!limit || limit === 0) return 0;

  return (usageCurrentPeriod / limit) * 100;
}

/**
 * Determines if enforcement notifications should be sent (at 80% and 95% of limit).
 * @param plan The plan tier
 * @param usageCurrentPeriod The current period usage
 * @returns Object indicating if 80% and/or 95% thresholds have been crossed
 */
export function getNotificationThresholds(
  plan: string | null,
  usageCurrentPeriod: number
): {
  eightyPercent: boolean;
  ninetyFivePercent: boolean;
} {
  const limit = getPlanLimit(plan);
  if (!limit || limit === 0) {
    return { eightyPercent: false, ninetyFivePercent: false };
  }

  const usagePercentage = getUsagePercentage(plan, usageCurrentPeriod);

  return {
    eightyPercent: usagePercentage >= 80,
    ninetyFivePercent: usagePercentage >= 95
  };
}

export const limitEvaluator = {
  getPlanLimit,
  isUsageWithinLimit,
  getUsagePercentage,
  getNotificationThresholds
};

export default limitEvaluator;