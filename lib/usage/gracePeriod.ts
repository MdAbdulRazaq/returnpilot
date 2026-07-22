// Grace period logic for paid tiers
// Based on PRICE-006: Implement 10% grace period before hard enforcement for paid tiers (Free tier has no grace period)

import { getTierById } from "@/lib/pricing/tiers";

/**
 * Check if grace period applies to a tier
 * @param tierId The pricing tier ID
 * @returns Boolean indicating if grace period applies (false for Free tier, true for paid tiers)
 */
export function hasGracePeriod(tierId: string): boolean {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown pricing tier: ${tierId}`);
  }
  // Free tier has no grace period, all paid tiers do
  return tierId !== "free";
}

/**
 * Calculate the grace period limit for a tier
 * @param tierId The pricing tier ID
 * @returns The limit including grace period (limit + 10%)
 */
export function getGracePeriodLimit(tierId: string): number {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown pricing tier: ${tierId}`);
  }

  // Free tier has no grace period
  if (!hasGracePeriod(tierId)) {
    return tier.protectedOrdersLimit;
  }

  // Paid tiers get 10% grace period
  return Math.floor(tier.protectedOrdersLimit * 1.1);
}

/**
 * Check if usage is within grace period
 * @param tierId The pricing tier ID
 * @param currentUsage The current usage count
 * @returns Object with grace period status information
 */
export function checkGracePeriodStatus(tierId: string, currentUsage: number): {
  withinLimit: boolean;
  withinGracePeriod: boolean;
  exceededGracePeriod: boolean;
  limit: number;
  gracePeriodLimit: number;
  usage: number;
  excess: number;
} {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown pricing tier: ${tierId}`);
  }

  const limit = tier.protectedOrdersLimit;
  const gracePeriodLimit = getGracePeriodLimit(tierId);
  const exceededGracePeriod = currentUsage > gracePeriodLimit;
  const withinGracePeriod = currentUsage > limit && currentUsage <= gracePeriodLimit;
  const withinLimit = currentUsage <= limit;
  const excess = Math.max(0, currentUsage - limit);

  return {
    withinLimit,
    withinGracePeriod,
    exceededGracePeriod,
    limit,
    gracePeriodLimit,
    usage: currentUsage,
    excess
  };
}

/**
 * Determine if access should be granted based on usage and grace period rules
 * @param tierId The pricing tier ID
 * @param currentUsage The current usage count
 * @returns Object indicating access status and reason
 */
export function getAccessStatus(tierId: string, currentUsage: number): {
  accessGranted: boolean;
  reason: string;
  usage: number;
  limit: number;
  gracePeriodLimit: number;
} {
  const status = checkGracePeriodStatus(tierId, currentUsage);

  let accessGranted: boolean;
  let reason: string;

  if (status.withinLimit) {
    accessGranted = true;
    reason = "Usage within plan limit";
  } else if (status.withinGracePeriod) {
    accessGranted = true;
    reason = "Usage within grace period (10% over limit)";
  } else {
    accessGranted = false;
    reason = "Usage exceeded grace period limit";
  }

  return {
    accessGranted,
    reason,
    usage: status.usage,
    limit: status.limit,
    gracePeriodLimit: status.gracePeriodLimit
  };
}

/**
 * Get a human-readable description of the grace period for a tier
 * @param tierId The pricing tier ID
 * @returns Description of grace period applicability
 */
export function getGracePeriodDescription(tierId: string): string {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown pricing tier: ${tierId}`);
  }

  if (!hasGracePeriod(tierId)) {
    return "No grace period (Free tier)";
  }

  const limit = tier.protectedOrdersLimit;
  const gracePeriodLimit = getGracePeriodLimit(tierId);
  const extra = gracePeriodLimit - limit;

  return `10% grace period (${limit} + ${extra} = ${gracePeriodLimit} protected orders)`;
}