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

/**
 * Check if explanation enhancements are available for a given tier
 * @param tierId The pricing tier ID
 * @returns Boolean indicating if explanation enhancements are available
 */
export function isExplanationEnhancementsAvailable(tierId: string): boolean {
  // Explanation enhancements follow the same pattern as detection intelligence from Milestone 10
  // Free: Basic explanation improvements (consistent formatting, basic evidence breakdown)
  // Starter: Basic explanation improvements
  // Growth: Enhanced explanations with confidence scoring and basic historical context
  // Pro: Full access to all explanation enhancements
  // Enterprise: Full access to all explanation enhancements plus custom explanation templates
  const tier = tierId.toLowerCase();
  return tier === "growth" || tier === "pro" || tier === "enterprise";
}

/**
 * Check if advanced explanation features are available for a given tier
 * @param tierId The pricing tier ID
 * @returns Boolean indicating if advanced explanation features are available
 */
export function isAdvancedExplanationAvailable(tierId: string): boolean {
  // Advanced explanation features include:
  // - Detailed evidence breakdown
  // - Advanced historical context
  // - Custom explanation templates
  // - Advanced feedback features
  const tier = tierId.toLowerCase();
  return tier === "pro" || tier === "enterprise";
}