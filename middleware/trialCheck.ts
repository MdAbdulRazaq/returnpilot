// Trial check middleware for verifying trial status
// Based on PRICE-005: Set trial duration to 14 days with full Pro tier access
// Builds on existing subscription status check patterns

import { NextResponse, type NextRequest } from "next/server";
import {
  isTrialActive,
  isExpired,
  isInWarningPeriod,
  getDaysRemaining,
  getDaysUntilWarning,
  getDaysUntilExpiration
} from "@/lib/trial/trialManager";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Middleware to check trial status for access control
 * Allows access during trial period, handles post-trial behavior
 */
export async function trialCheckMiddleware(
  req: NextRequest,
  shopId: string
): Promise<NextResponse | null> {
  const db = getAdminClient();

  // Get trial state for the shop
  // In a real implementation, this would be stored in a trials table or similar
  // For this implementation, we'll derive trial state from shop record
  const { data: shop, error } = await db
    .from("shops")
    .select("id, trial_started_at, trial_ends_at, plan, billing_active")
    .eq("id", shopId)
    .single();

  if (error || !shop) {
    // If we can't get shop info, fail open to avoid blocking legitimate requests
    return null;
  }

  // Construct trial state from shop data
  const trialState = {
    id: `trial-${shopId}`,
    shopId: shop.id,
    startedAt: shop.trial_started_at ?? "",
    endsAt: shop.trial_ends_at ?? "",
    convertedToPaid: shop.plan !== null && shop.billing_active === true,
    convertedAt: shop.plan !== null && shop.billing_active === true ? new Date().toISOString() : null,
    selectedTierId: shop.plan
  };

  // Check if trial has been converted to paid
  if (trialState.convertedToPaid) {
    // Trial has been converted, allow normal access control (handled by other middleware)
    return null;
  }

  // Check if trial is still active
  if (!isTrialActive(trialState)) {
    // Trial has expired
    // According to PRICE-202 through PRICE-208:
    // - Day 13: Warning email with upgrade prompts
    // - Day 14: Trial expires, limited access notice in dashboard
    // - Days 15-21: Grace period with Free tier features (limited functionality)
    // - Day 22: Auto-transition to Free tier if no upgrade

    const daysSinceExpiration = Math.floor((Date.now() - new Date(trialState.endsAt).getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceExpiration >= 21) {
      // Day 22+: Auto-transition to Free tier if no upgrade
      // In a real implementation, we would update the shop record to Free tier
      // For this middleware, we allow access but other systems should handle the transition
      return null;
    }

    // During grace period (days 15-21), provide Free tier features
    // For access control, we allow basic access but other systems should limit to Free tier features
    return null;
  }

  // Trial is active - allow access
  // Trial users get full Pro tier access during trial (PRICE-005)
  // Actual feature gating would be handled by entitlement checks that are trial-aware
  return null;
}

/**
 * Enhanced trial check that returns trial status information
 * Useful for endpoints that need to return trial state to the client
 */
export async function trialCheckWithInfo(
  req: NextRequest,
  shopId: string
): Promise<{ trialInfo: TrialInfo | null; response: NextResponse | null }> {
  const db = getAdminClient();

  // Get shop data
  const { data: shop, error } = await db
    .from("shops")
    .select("id, trial_started_at, trial_ends_at, plan, billing_active")
    .eq("id", shopId)
    .single();

  if (error || !shop) {
    return { trialInfo: null, response: null };
  }

  // Construct trial state
  const trialState = {
    id: `trial-${shopId}`,
    shopId: shop.id,
    startedAt: shop.trial_started_at ?? "",
    endsAt: shop.trial_ends_at ?? "",
    convertedToPaid: shop.plan !== null && shop.billing_active === true,
    convertedAt: shop.plan !== null && shop.billing_active === true ? new Date().toISOString() : null,
    selectedTierId: shop.plan
  };

  // Build trial info for client
  const trialInfo: TrialInfo = {
    isActive: isTrialActive(trialState),
    isExpired: isExpired(trialState),
    daysRemaining: getDaysRemaining(trialState),
    daysUntilWarning: getDaysUntilWarning(trialState),
    daysUntilExpiration: getDaysUntilExpiration(trialState),
    isInWarningPeriod: isInWarningPeriod(trialState),
    startedAt: trialState.startedAt,
    endsAt: trialState.endsAt
  };

  // Determine if we should block access
  let response: NextResponse | null = null;

  // Block access only in specific post-trial scenarios
  if (!trialState.convertedToPaid) {
    if (isExpired(trialState)) {
      const daysSinceExpiration = Math.floor((Date.now() - new Date(trialState.endsAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceExpiration >= 21) {
        // Day 22+: After grace period, block access until upgrade
        // In a real system, this would redirect to upgrade page or show upgrade prompt
        response = NextResponse.json(
          { error: "Trial has expired. Please select a plan to continue." },
          { status: 402 } // Payment Required
        );
      }
      // During grace period (days 15-21), we allow access but limit features elsewhere
    }
  }

  return { trialInfo, response };
}

/**
 * Interface for trial information returned to clients
 */
export interface TrialInfo {
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number; // Days remaining in trial
  daysUntilWarning: number; // Days until warning period (day 13) starts
  daysUntilExpiration: number; // Days until trial expires (day 14)
  isInWarningPeriod: boolean;
  startedAt: string; // ISO timestamp
  endsAt: string; // ISO timestamp
}