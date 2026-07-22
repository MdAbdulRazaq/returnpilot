// White-label options manager
// Based on PRICE-004: Feature matrix allocation - white-label options available in Enterprise tier only

import { isFeatureAvailable } from "../../lib/entitlement/featureMatrix";

/**
 * Check if white-label options are available for a given tier
 * @param tierId The pricing tier ID
 * @returns Boolean indicating if white-label options are available
 */
export function isWhiteLabelAvailable(tierId: string): boolean {
  return isFeatureAvailable(tierId, "whiteLabelOptions");
}