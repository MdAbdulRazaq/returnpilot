// Cancellation manager
// Based on PRICE-XXX: Cancellation and re-subscription logic

import { getTierById } from "../pricing/tiers";

/**
 * Handle subscription cancellation
 * @param tierId The current pricing tier ID
 * @param immediate Whether to cancel immediately or at the end of the billing period
 * @returns Object describing the cancellation result
 */
export function cancelSubscription(tierId: string, immediate: boolean = false): {
  tierId: string;
  effectiveDate: string; // ISO string
  immediate: boolean;
  message: string;
} {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown tier: ${tierId}`);
  }

  const effectiveDate = immediate ? new Date().toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Assume 30-day billing period for simplicity

  return {
    tierId,
    effectiveDate: effectiveDate,
    immediate,
    message: immediate
      ? `Subscription to ${tier.name} cancelled immediately.`
      : `Subscription to ${tier.name} will be cancelled at the end of the billing period (${effectiveDate}).`
  };
}

/**
 * Handle subscription re-subscription (restart)
 * @param tierId The pricing tier ID to resubscribe to
 * @returns Object describing the re-subscription result
 */
export function resubscribeToSubscription(tierId: string): {
  tierId: string;
  startDate: string; // ISO string
  message: string;
} {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown tier: ${tierId}`);
  }

  const startDate = new Date().toISOString();

  return {
    tierId,
    startDate,
    message: `Resubscribed to ${tier.name} starting ${startDate}.`
  };
}