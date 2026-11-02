/**
 * Currency formatting utilities.
 * Uses Intl.NumberFormat for locale-aware formatting.
 */

/**
 * Format a money amount (stored as string "123.45") for display.
 * Defaults to USD if currency not provided; extendable for shop currency later.
 */
export function formatMoney(
  amount: string,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  const num = parseFloat(amount);
  if (Number.isNaN(num)) return `${currency} 0.00`;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a raw number for display as currency.
 */
export function formatMoneyNumber(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}