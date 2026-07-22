// Annual discount calculation utility
// Based on PRICE-015: Set annual pricing discount to 17% (2 months free) for annual commitments

/**
 * Calculate the annual discount amount (17% or 2 months free)
 * @param monthlyPriceCents Monthly price in cents
 * @returns Discount amount in cents for annual commitment
 */
export function calculateAnnualDiscountCents(monthlyPriceCents: number): number {
  // 17% discount = 2 months free on a 12-month commitment
  // Discount = 2 months * monthly price
  return Math.round(monthlyPriceCents * 2);
}

/**
 * Calculate annual price with 17% discount applied
 * @param monthlyPriceCents Monthly price in cents
 * @returns Annual price in cents with discount applied
 */
export function calculateAnnualPriceCents(monthlyPriceCents: number): number {
  const annualPriceWithoutDiscount = monthlyPriceCents * 12;
  const discountCents = calculateAnnualDiscountCents(monthlyPriceCents);
  return annualPriceWithoutDiscount - discountCents;
}

/**
 * Calculate the discount percentage
 * @returns Discount percentage (fixed at 17% for ReturnPilot)
 */
export function getAnnualDiscountPercentage(): number {
  return 17; // Fixed 17% discount as per PRICE-015
}

/**
 * Calculate the number of free months equivalent to the annual discount
 * @returns Number of free months (fixed at 2 for ReturnPilot)
 */
export function getFreeMonthsEquivalent(): number {
  return 2; // Equivalent to 2 months free as per PRICE-015
}

/**
 * Validate if the annual price matches the expected 17% discount
 * @param monthlyPriceCents Monthly price in cents
 * @param annualPriceCents Annual price in cents
 * @returns Boolean indicating if the annual price correctly reflects 17% discount
 */
export function validateAnnualDiscount(monthlyPriceCents: number, annualPriceCents: number): boolean {
  const expectedAnnualPrice = calculateAnnualPriceCents(monthlyPriceCents);
  return annualPriceCents === expectedAnnualPrice;
}

/**
 * Format the discount as a human-readable string
 * @returns Formatted discount string (e.g., "17% (2 months free)")
 */
export function getAnnualDiscountDescription(): string {
  return "17% (2 months free)";
}