// Pricing engine for calculating charges based on plan and billing cycle
// Based on PRICE-003 (specific pricing amounts), PRICE-015 (annual pricing discount)

import { PRICING_TIERS, PricingTier, getTierById } from "./tiers";

// Re-export from tiers for convenience
export { PRICING_TIERS, getTierById };
export type { PricingTier };

export interface PriceCalculation {
  tierId: string;
  tierName: string;
  amountCents: number;
  currency: string; // Assuming USD for now, could be made configurable
  billingCycle: "monthly" | "annual";
  savingsCents?: number; // Savings compared to monthly billing (for annual)
  savingsPercentage?: number; // Percentage savings
}

/**
 * Calculate the price for a given tier and billing cycle
 * @param tierId The ID of the pricing tier
 * @param billingCycle Either "monthly" or "annual"
 * @returns Price calculation details
 */
export function calculatePrice(tierId: string, billingCycle: "monthly" | "annual"): PriceCalculation {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown pricing tier: ${tierId}`);
  }

  let amountCents: number;
  let savingsCents: number | undefined;
  let savingsPercentage: number | undefined;

  if (billingCycle === "monthly") {
    amountCents = tier.monthlyPriceCents;
  } else { // annual
    // Use annual price if available, otherwise calculate from monthly
    if (tier.annualPriceCents !== undefined) {
      amountCents = tier.annualPriceCents;
    } else {
      // For enterprise or tiers without annual pricing, calculate 12 months
      amountCents = tier.monthlyPriceCents * 12;
    }

    // Calculate savings compared to paying monthly for 12 months
    const monthlyEquivalent = tier.monthlyPriceCents * 12;
    if (amountCents < monthlyEquivalent) {
      savingsCents = monthlyEquivalent - amountCents;
      savingsPercentage = Math.round((savingsCents / monthlyEquivalent) * 100);
    }
  }

  return {
    tierId: tier.id,
    tierName: tier.name,
    amountCents,
    currency: "USD",
    billingCycle,
    savingsCents,
    savingsPercentage
  };
}

/**
 * Get the monthly price for a tier (useful for comparisons)
 * @param tierId The ID of the pricing tier
 * @returns Monthly price in cents
 */
export function getMonthlyPriceCents(tierId: string): number {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown pricing tier: ${tierId}`);
  }
  return tier.monthlyPriceCents;
}

/**
 * Get the protected orders limit for a tier
 * @param tierId The ID of the pricing tier
 * @returns Monthly limit of protected orders
 */
export function getProtectedOrdersLimit(tierId: string): number {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown pricing tier: ${tierId}`);
  }
  return tier.protectedOrdersLimit;
}

/**
 * Check if a tier offers a specific feature
 * @param tierId The ID of the pricing tier
 * @param feature The feature to check (matches interface keys in PricingTier)
 * @returns Boolean indicating if the feature is available
 */
export function hasFeature<T extends keyof PricingTier["features"]>(
  tierId: string,
  feature: T
): boolean {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown pricing tier: ${tierId}`);
  }
  // For boolean features, return the value directly
  // For string features, check if the value indicates the feature is present
  const featureValue = tier.features[feature];

  // Handle boolean features
  if (["coreDetection", "basicFiltering", "advancedFiltering", "apiAccess",
       "whiteLabelOptions", "slaGuarantee"].includes(feature)) {
    return !!featureValue;
  }

  // For string features, check if the value indicates availability
  // (not "None" or similar indicators of unavailability)
  if (typeof featureValue === "string") {
    const lowerValue = featureValue.toLowerCase();
    return !lowerValue.includes("none") &&
           lowerValue !== "" &&
           lowerValue !== "not available";
  }

  // For numeric features (like alertHistoryDays), check if > 0
  if (feature === "alertHistoryDays") {
    return (featureValue as number) > 0;
  }

  // Default to true for other cases (should not happen with proper typing)
  return true;
}