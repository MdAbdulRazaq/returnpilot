// CSV export scheduler
// Based on PRICE-004: Feature matrix allocation - CSV export availability varies by tier

import { getTierById } from "../../lib/pricing/tiers";

/**
 * Get the CSV export frequency for a given tier
 * @param tierId The pricing tier ID
 * @returns CSV export frequency string, or null if not available
 */
export function getCsvExportFrequency(tierId: string): string | null {
  const tier = getTierById(tierId);
  if (!tier) {
    return null;
  }
  const frequency = tier.features.csvExport;
  return frequency === "None" ? null : frequency;
}