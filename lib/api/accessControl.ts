// API access control
// Based on PRICE-004: Feature matrix allocation - API access available in Pro and Enterprise tiers

import { isFeatureAvailable } from "../../lib/entitlement/featureMatrix";

/**
 * Check if API access is available for a given tier
 * @param tierId The pricing tier ID
 * @returns Boolean indicating if API access is available
 */
export function isApiAccessAvailable(tierId: string): boolean {
  return isFeatureAvailable(tierId, "apiAccess");
}