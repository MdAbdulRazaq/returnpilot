// Alert history manager
// Based on PRICE-004: Feature matrix allocation - alert history duration varies by tier

import { getTierById } from "../../lib/pricing/tiers";

/**
 * Get the alert history duration in days for a given tier
 * @param tierId The pricing tier ID
 * @returns Alert history duration in days, or 0 if not available
 */
export function getAlertHistoryDays(tierId: string): number {
  const tier = getTierById(tierId);
  if (!tier) {
    return 0;
  }
  return tier.features.alertHistoryDays;
}