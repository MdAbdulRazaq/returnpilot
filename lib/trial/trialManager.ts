// Trial manager for handling 14-day trial lifecycle with full Pro tier access
// Based on PRICE-005: Set trial duration to 14 days with full Pro tier access

import { PricingTier } from "../pricing/tiers";

export interface TrialState {
  id: string; // Unique identifier for the trial (could be shop ID or trial ID)
  shopId: string; // Associated shop ID
  startedAt: string; // ISO timestamp when trial started
  endsAt: string; // ISO timestamp when trial ends (14 days after start)
  convertedToPaid: boolean; // Whether trial has been converted to paid subscription
  convertedAt: string | null; // ISO timestamp when trial was converted (if applicable)
  selectedTierId: string | null; // Tier selected after trial (if converted)
}

/**
 * Create a new trial state
 * @param shopId The shop ID associated with the trial
 * @returns New trial state
 */
export function createTrial(shopId: string): TrialState {
  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setDate(endsAt.getDate() + 14); // 14 days from now

  return {
    id: `trial-${shopId}-${now.getTime()}`,
    shopId,
    startedAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
    convertedToPaid: false,
    convertedAt: null,
    selectedTierId: null
  };
}

/**
 * Check if a trial is still active
 * @param trial The trial state to check
 * @returns Boolean indicating if trial is still active
 */
export function isTrialActive(trial: TrialState): boolean {
  if (trial.convertedToPaid) {
    return false; // Trial is no longer active if converted
  }

  const now = new Date();
  const endsAt = new Date(trial.endsAt);
  return now < endsAt;
}

/**
 * Get the days remaining in the trial
 * @param trial The trial state
 * @returns Number of days remaining (0 if trial has ended)
 */
export function getDaysRemaining(trial: TrialState): number {
  if (trial.convertedToPaid) {
    return 0; // No days remaining if converted
  }

  const now = new Date();
  const endsAt = new Date(trial.endsAt);
  const diffTime = endsAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Check if trial is in warning period (day 13)
 * @param trial The trial state
 * @returns Boolean indicating if trial is in warning period
 */
export function isInWarningPeriod(trial: TrialState): boolean {
  if (trial.convertedToPaid) {
    return false;
  }

  const daysRemaining = getDaysRemaining(trial);
  return daysRemaining === 1; // Day 13 warning (1 day remaining)
}

/**
 * Check if trial is in expiration period (day 14)
 * @param trial The trial state
 * @returns Boolean indicating if trial has expired
 */
export function isExpired(trial: TrialState): boolean {
  if (trial.convertedToPaid) {
    return false;
  }

  const now = new Date();
  const endsAt = new Date(trial.endsAt);
  return now >= endsAt;
}

/**
 * Convert trial to paid subscription
 * @param trial The trial state to convert
 * @param selectedTierId The tier ID selected after trial
 * @returns Updated trial state
 */
export function convertToPaid(trial: TrialState, selectedTierId: string): TrialState {
  // Validate that the selected tier ID is valid
  // In a real implementation, we would check against available tiers
  // For now, we'll assume it's valid

  return {
    ...trial,
    convertedToPaid: true,
    convertedAt: new Date().toISOString(),
    selectedTierId
  };
}

/**
 * Get the tier that should be available during trial (full Pro tier access)
 * @returns The pricing tier available during trial
 */
export function getTrialTier(): PricingTier {
  // According to PRICE-005: 14-day free trial with full Pro tier access
  // In a real implementation, we would fetch the actual Pro tier definition
  // For now, we'll return a structure representing Pro tier

  // This function would ideally fetch from a configuration or database
  // For this implementation, we return a placeholder indicating Pro tier access
  throw new Error("Trial tier access should be implemented by checking if current date is within trial period and granting Pro tier features");
}

/**
 * Check if a specific feature is available during trial
 * @param feature Feature name to check
 * @returns Boolean indicating if feature is available during trial
 */
export function isFeatureAvailableInTrial(_feature: string): boolean {
  // During trial, users get full Pro tier access
  // So we check if the feature is available in Pro tier
  // In a real implementation, this would check the Pro tier's feature set

  // For this implementation, we'll return true for all features since
  // PRICE-005 states "full Pro tier access"
  return true;
}

/**
 * Get days until trial expiration warning (day 13)
 * @param trial The trial state
 * @returns Days until warning period starts, or 0 if already in warning period
 */
export function getDaysUntilWarning(trial: TrialState): number {
  if (trial.convertedToPaid) {
    return 0;
  }

  const daysRemaining = getDaysRemaining(trial);
  // Warning period starts at day 13 (when 1 day remains)
  if (daysRemaining <= 1) {
    return 0; // Already in warning period
  }
  return daysRemaining - 1; // Days until warning starts
}

/**
 * Get days until trial expiration (day 14)
 * @param trial The trial state
 * @returns Days until trial expires, or 0 if already expired
 */
export function getDaysUntilExpiration(trial: TrialState): number {
  if (trial.convertedToPaid) {
    return 0;
  }

  return getDaysRemaining(trial); // Days remaining until expiration
}