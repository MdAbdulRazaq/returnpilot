// Refund policy
// Based on PRICE-XXX: Refund policy - billing errors only

/**
 * Check if a refund reason is eligible for refund
 * @param reason The reason for the refund request
 * @returns Boolean indicating if the refund is eligible
 */
export function isRefundEligible(reason: string): boolean {
  // Only billing errors are eligible for refund
  const billingErrorKeywords = ['billing error', 'incorrect charge', 'duplicate charge', 'failed service'];
  const lowerReason = reason.toLowerCase();
  return billingErrorKeywords.some(keyword => lowerReason.includes(keyword));
}