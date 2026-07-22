// Upgrade/downgrade logic with proration calculations
// Based on PRICE-010 (immediate upgrade effect), PRICE-011 (downgrade at next billing date)
// And PRICE-078 through PRICE-091 (upgrade/downgrade behavior)

import { PRICING_TIERS, PricingTier, getTierById } from "./pricingEngine";

export interface ProrationCalculation {
  currentTierId: string;
  newTierId: string;
  changeType: "upgrade" | "downgrade";
  daysElapsedInCycle: number; // Days elapsed in current billing cycle
  totalDaysInCycle: number; // Total days in billing cycle
  proratedAmountCents: number; // Amount to charge/credit (positive for charge, negative for credit)
  effectiveDate: string; // When the change takes effect (ISO string)
  description: string; // Human-readable description of the change
}

/**
 * Calculate proration for a plan change
 * @param currentTierId Current plan tier ID
 * @param newTierId New plan tier ID
 * @param daysElapsedInCycle Days elapsed in current billing cycle
 * @param totalDaysInCycle Total days in billing cycle (typically 30 or 31)
 * @param billingCycle Current billing cycle ("monthly" or "annual")
 * @returns Proration calculation details
 */
export function calculateProration(
  currentTierId: string,
  newTierId: string,
  daysElapsedInCycle: number,
  totalDaysInCycle: number,
  billingCycle: "monthly" | "annual" = "monthly"
): ProrationCalculation {
  const currentTier = getTierById(currentTierId);
  const newTier = getTierById(newTierId);

  if (!currentTier) {
    throw new Error(`Unknown current pricing tier: ${currentTierId}`);
  }
  if (!newTier) {
    throw new Error(`Unknown new pricing tier: ${newTierId}`);
  }

  // Validate inputs
  if (daysElapsedInCycle < 0 || daysElapsedInCycle > totalDaysInCycle) {
    throw new Error(`Invalid daysElapsedInCycle: ${daysElapsedInCycle}. Must be between 0 and ${totalDaysInCycle}`);
  }

  // Calculate daily rate for current and new plans
  let currentDailyRateCents: number;
  let newDailyRateCents: number;

  if (billingCycle === "monthly") {
    currentDailyRateCents = currentTier.monthlyPriceCents / totalDaysInCycle;
    newDailyRateCents = newTier.monthlyPriceCents / totalDaysInCycle;
  } else { // annual
    // For annual billing, use annual price or calculate from monthly
    const currentAnnualPrice = currentTier.annualPriceCents ?? (currentTier.monthlyPriceCents * 12);
    const newAnnualPrice = newTier.annualPriceCents ?? (newTier.monthlyPriceCents * 12);

    currentDailyRateCents = currentAnnualPrice / 365; // Using 365 days for annual
    newDailyRateCents = newAnnualPrice / 365;
  }

  // Calculate proration based on change type
  let proratedAmountCents: number;
  let changeType: "upgrade" | "downgrade";
  let effectiveDate: string;
  let description: string;

  const isUpgrade = PRICING_TIERS.indexOf(currentTier) < PRICING_TIERS.indexOf(newTier);

  if (isUpgrade) {
    changeType = "upgrade";
    // PRICE-010: Upgrade behavior is immediate effect with prorated charges

    // Customer has used part of the period at the old rate,
    // will pay the new rate for the remaining period
    const daysRemaining = totalDaysInCycle - daysElapsedInCycle;

    // Credit for unused portion of current plan (at daily rate)
    const currentPlanCredit = currentDailyRateCents * daysElapsedInCycle;

    // Charge for remaining period at new plan rate
    const newPlanCharge = newDailyRateCents * daysRemaining;

    // Net amount to charge (could be negative if upgrading from much more expensive plan)
    proratedAmountCents = newPlanCharge - currentPlanCredit;

    effectiveDate = new Date().toISOString(); // Immediate effect
    description = `Upgraded from ${currentTier.name} to ${newTier.name}`;
  } else {
    changeType = "downgrade";
    // PRICE-011: Downgrade behavior is effective at next billing date with prorated credits

    // For downgrades, the customer continues with current plan until end of period,
    // then gets a credit applied to next bill
    const daysRemaining = totalDaysInCycle - daysElapsedInCycle;

    // Credit for the unused portion of the period they won't use the higher plan
    // (difference between what they would have paid for current plan vs new plan)
    const dailyRateDifference = currentDailyRateCents - newDailyRateCents;
    proratedAmountCents = -1 * (dailyRateDifference * daysRemaining); // Negative for credit

    effectiveDate = new Date(Date.now() + (daysRemaining * 24 * 60 * 60 * 1000)).toISOString(); // End of period
    description = `Downgraded from ${currentTier.name} to ${newTier.name} (effective ${effectiveDate})`;
  }

  return {
    currentTierId: currentTier.id,
    newTierId: newTier.id,
    changeType,
    daysElapsedInCycle,
    totalDaysInCycle,
    proratedAmountCents: Math.round(proratedAmountCents), // Round to nearest cent
    effectiveDate,
    description
  };
}

/**
 * Determine if a plan change is an upgrade or downgrade
 * @param currentTierId Current plan tier ID
 * @param newTierId New plan tier ID
 * @returns "upgrade", "downgrade", or "same" if tiers are identical
 */
export function getChangeType(currentTierId: string, newTierId: string): "upgrade" | "downgrade" | "same" {
  const currentIndex = PRICING_TIERS.findIndex((t: PricingTier) => t.id === currentTierId);
  const newIndex = PRICING_TIERS.findIndex((t: PricingTier) => t.id === newTierId);

  if (currentIndex === -1 || newIndex === -1) {
    throw new Error("Invalid tier ID provided");
  }

  if (currentIndex === newIndex) return "same";
  return currentIndex < newIndex ? "upgrade" : "downgrade";
}

/**
 * Get the human-readable name for a tier
 * @param tierId The tier ID
 * @returns Tier name
 */
export function getTierName(tierId: string): string {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown pricing tier: ${tierId}`);
  }
  return tier.name;
}