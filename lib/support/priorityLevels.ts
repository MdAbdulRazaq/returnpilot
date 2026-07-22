// Priority support levels
// Based on PRICE-004: Feature matrix allocation - priority support available in Starter tier and above

import { getTierById } from "../pricing/tiers";

/**
 * Get the priority support level for a given tier
 * @param tierId The pricing tier ID
 * @returns Priority support level string, or null if not available
 */
export function getPrioritySupportLevel(tierId: string): string | null {
  const tier = getTierById(tierId);
  if (!tier) {
    return null;
  }
  const level = tier.features.prioritySupport;
  return level === "None" ? null : level;
}