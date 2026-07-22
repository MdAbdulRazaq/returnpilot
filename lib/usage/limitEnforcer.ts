// Limit enforcer for blocking new protection processing after limit exceeded
// Based on PRICE-008: Block new protection processing after exceeding grace period limit; maintain access to existing alerts

import { getAccessStatus } from "./gracePeriod";
import { getTierById } from "../pricing/tiers";

/**
 * Determine if new protection processing should be allowed
 * @param tierId The pricing tier ID
 * @param currentUsage The current usage count (protected orders in current period)
 * @returns Object indicating if new protection processing is allowed
 */
export function canProcessNewProtection(tierId: string, currentUsage: number): {
  allowed: boolean;
  reason: string;
  usage: number;
  limit: number;
  gracePeriodLimit: number;
} {
  const status = getAccessStatus(tierId, currentUsage);

  // According to PRICE-008:
  // "Block new protection processing after exceeding grace period limit; maintain access to existing alerts"
  // This means:
  // - Within limit: Allow new protection processing
  // - Within grace period: Block new protection processing (but maintain access to existing alerts)
  // - Exceeded grace period: Block new protection processing

  let allowed: boolean;
  let reason: string;

  if (status.accessGranted && status.reason === "Usage within plan limit") {
    allowed = true;
    reason = "Usage within plan limit - new protection processing allowed";
  } else {
    allowed = false;
    if (status.reason === "Usage within grace period (10% over limit)") {
      reason = "Usage within grace period - new protection processing blocked (existing alerts accessible)";
    } else {
      reason = "Usage exceeded grace period limit - new protection processing blocked";
    }
  }

  return {
    allowed,
    reason,
    usage: status.usage,
    limit: status.limit,
    gracePeriodLimit: status.gracePeriodLimit
  };
}

/**
 * Determine if access to existing alerts should be allowed
 * @param tierId The pricing tier ID
 * @param currentUsage The current usage count (protected orders in current period)
 * @returns Object indicating if access to existing alerts is allowed
 */
export function canAccessExistingAlerts(tierId: string, currentUsage: number): {
  allowed: boolean;
  reason: string;
  usage: number;
  limit: number;
  gracePeriodLimit: number;
} {
  const status = getAccessStatus(tierId, currentUsage);

  // According to PRICE-008: "maintain access to existing alerts"
  // This means access to existing alerts should always be allowed
  // regardless of usage level (unlike new protection processing)

  return {
    allowed: true,
    reason: "Access to existing alerts is always maintained per PRICE-008",
    usage: status.usage,
    limit: status.limit,
    gracePeriodLimit: status.gracePeriodLimit
  };
}

/**
 * Get limit enforcement status for UI/display purposes
 * @param tierId The pricing tier ID
 * @param currentUsage The current usage count (protected orders in current period)
 * @returns Object with detailed limit enforcement status
 */
export function getLimitEnforcementStatus(tierId: string, currentUsage: number): {
  tierId: string;
  usage: number;
  limit: number;
  gracePeriodLimit: number;
  withinLimit: boolean;
  withinGracePeriod: boolean;
  exceededGracePeriod: boolean;
  newProtectionAllowed: boolean;
  existingAlertsAccessible: boolean;
  status: string; // Human-readable status for UI
} {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown pricing tier: ${tierId}`);
  }

  const protectionStatus = canProcessNewProtection(tierId, currentUsage);
  const accessStatus = canAccessExistingAlerts(tierId, currentUsage);

  return {
    tierId,
    usage: protectionStatus.usage,
    limit: protectionStatus.limit,
    gracePeriodLimit: protectionStatus.gracePeriodLimit,
    withinLimit: protectionStatus.usage <= protectionStatus.limit,
    withinGracePeriod: protectionStatus.usage > protectionStatus.limit &&
                     protectionStatus.usage <= protectionStatus.gracePeriodLimit,
    exceededGracePeriod: protectionStatus.usage > protectionStatus.gracePeriodLimit,
    newProtectionAllowed: protectionStatus.allowed,
    existingAlertsAccessible: accessStatus.allowed,
    status: (() => {
      if (protectionStatus.usage <= protectionStatus.limit) {
        return `Within limit (${protectionStatus.usage}/${protectionStatus.limit})`;
      } else if (protectionStatus.usage <= protectionStatus.gracePeriodLimit) {
        return `Within grace period (${protectionStatus.usage}/${protectionStatus.gracePeriodLimit}) - new protection blocked`;
      } else {
        return `Exceeded grace period (${protectionStatus.usage}/${protectionStatus.gracePeriodLimit}) - new protection blocked`;
      }
    })()
  };
}