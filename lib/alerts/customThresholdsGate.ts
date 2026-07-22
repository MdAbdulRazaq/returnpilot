// Custom alert thresholds access control gate
// Based on PRICE-004: Feature matrix allocation - custom alert thresholds available in Growth tier and above (Basic) and Pro/Enterprise (Full)

import { isFeatureAvailable } from "../entitlement/featureMatrix";

/**
 * Check if custom alert thresholds are available for a given tier
 * @param tierId The pricing tier ID
 * @returns Boolean indicating if custom alert thresholds are available
 */
export function isCustomAlertThresholdsAvailable(tierId: string): boolean {
  return isFeatureAvailable(tierId, "customAlertThresholds");
}