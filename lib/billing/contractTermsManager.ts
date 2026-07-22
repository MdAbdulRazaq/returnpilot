// Contract terms manager
// Based on PRICE-XXX: Monthly/annual contract handling

import { getTierById } from "../../lib/pricing/tiers";

/**
 * Get the contract terms for a given tier
 * @param tierId The pricing tier ID
 * @returns Contract terms string, or null if not available
 */
export function getContractTerms(tierId: string): string | null {
  const tier = getTierById(tierId);
  if (!tier) {
    return null;
  }
  return tier.features.contractTerms === "N/A" ? null : tier.features.contractTerms;
}