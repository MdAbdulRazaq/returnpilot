// Onboarding assistance levels
// Based on PRICE-004: Feature matrix allocation - onboarding assistance available in Starter tier and above

import { getTierById } from "../pricing/tiers";

/**
 * Get the onboarding assistance level for a given tier
 * @param tierId The pricing tier ID
 * @returns Onboarding assistance level string, or null if not available
 */
export function getOnboardingAssistanceLevel(tierId: string): string | null {
  const tier = getTierById(tierId);
  if (!tier) {
    return null;
  }
  const level = tier.features.onboardingAssistance;
  return level === "None" ? null : level;
}