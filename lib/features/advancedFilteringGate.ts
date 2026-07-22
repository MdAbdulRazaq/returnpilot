// Advanced filtering access control gate
// Based on PRICE-004: Feature matrix allocation - advanced filtering available in Growth tier and above

import { isFeatureAvailable } from "../entitlement/featureMatrix";

/**
 * Check if advanced filtering is available for a given tier
 * @param tierId The pricing tier ID
 * @returns Boolean indicating if advanced filtering is available
 */
export function isAdvancedFilteringAvailable(tierId: string): boolean {
  return isFeatureAvailable(tierId, "advancedFiltering");
}