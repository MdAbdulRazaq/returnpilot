// Data export manager
// Based on PRICE-004: Feature matrix allocation - data export available in Starter tier and above

import { getTierById } from "../../lib/pricing/tiers";

/*
 * Get the data export availability for a given tier
 * @param tierId The pricing tier ID
 * @returns Data export availability string, or null if not available
 */
export function getDataExportAvailability(tierId: string): string | null {
  const tier = getTierById(tierId);
  if (!tier) {
    return null;
  }
  const availability = tier.features.dataExport;
  return availability === "None" ? null : availability;
}