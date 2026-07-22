// SLA guarantee tracker
// Based on PRICE-004: Feature matrix allocation - SLA guarantee available in Enterprise tier only

import { isFeatureAvailable } from "../../lib/entitlement/featureMatrix";

/**
 * Check if SLA guarantee is available for a given tier
 * @param tierId The pricing tier ID
 * @returns Boolean indicating if SLA guarantee is available
 */
export function isSlaGuaranteeAvailable(tierId: string): boolean {
  return isFeatureAvailable(tierId, "slaGuarantee");
}