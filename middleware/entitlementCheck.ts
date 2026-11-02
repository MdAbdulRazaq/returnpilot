import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient, type ShopRow } from "@/lib/supabase/admin";

/**
 * Middleware to check feature access based on plan tier.
 * Blocks requests when attempting to access features not included in the current plan.
 */
export async function entitlementCheckMiddleware(
  req: NextRequest,
  shopId: string,
  requiredFeature: keyof FeatureMatrix
): Promise<NextResponse | null> {
  const db = getAdminClient();

  // Get shop details including plan
  const { data: shop, error } = await db
    .from("shops")
    .select("plan")
    .eq("id", shopId)
    .single();

  if (error || !shop) {
    // If we can't get shop info, fail open to avoid blocking legitimate requests
    return null;
  }

  // Check if the feature is available in the current plan
  const featureAvailable = isFeatureAvailable(shop.plan, requiredFeature);

  if (!featureAvailable) {
    // Block the request - feature not available in current plan
    return NextResponse.json(
      { error: `This feature is not available in your current plan. Please upgrade to access ${requiredFeature}.` },
      { status: 402 } // Payment Required
    );
  }

  // Feature is available, allow request
  return null;
}

/**
 * Feature matrix defining which features are available in each plan tier.
 * Based on the feature matrix in docs/product/billing.md Section 6.
 */
interface FeatureMatrix {
  coreDetection: boolean;
  dashboardAlerts: boolean;
  emailNotifications: boolean;
  alertHistory: boolean;
  basicFiltering: boolean;
  advancedFiltering: boolean;
  csvExport: boolean;
  apiAccess: boolean;
  customAlertThresholds: boolean;
  prioritySupport: boolean;
  onboardingAssistance: boolean;
  multiUserAccess: boolean;
  whiteLabelOptions: boolean;
  slaGuarantee: boolean;
  dataExport: boolean;
}

/**
 * Returns true if the feature is available in the given plan.
 */
function isFeatureAvailable(plan: string | null, feature: keyof FeatureMatrix): boolean {
  // Default to false if no plan
  if (!plan) return false;

  // Define feature availability by plan tier
  const featureMatrix: Record<string, FeatureMatrix> = {
    free: {
      coreDetection: true,
      dashboardAlerts: false, // Weekly digest only in actual implementation
      emailNotifications: false, // Weekly digest only
      alertHistory: false, // 30 days
      basicFiltering: true,
      advancedFiltering: false,
      csvExport: false,
      apiAccess: false,
      customAlertThresholds: false,
      prioritySupport: false,
      onboardingAssistance: false,
      multiUserAccess: false,
      whiteLabelOptions: false,
      slaGuarantee: false,
      dataExport: false
    },
    starter: {
      coreDetection: true,
      dashboardAlerts: true, // Daily digest
      emailNotifications: true, // Daily
      alertHistory: true, // 60 days
      basicFiltering: true,
      advancedFiltering: false,
      csvExport: false,
      apiAccess: false,
      customAlertThresholds: false,
      prioritySupport: true, // Email (24h)
      onboardingAssistance: false, // Self-serve
      multiUserAccess: false, // 1 user
      whiteLabelOptions: false,
      slaGuarantee: false,
      dataExport: false
    },
    growth: {
      coreDetection: true,
      dashboardAlerts: true, // Daily digest + real-time
      emailNotifications: true, // Daily + urgent
      alertHistory: true, // 90 days
      basicFiltering: true,
      advancedFiltering: true,
      csvExport: true, // Monthly
      apiAccess: false,
      customAlertThresholds: true, // Basic
      prioritySupport: true, // Email (12h)
      onboardingAssistance: false, // Self-serve
      multiUserAccess: true, // 3 users
      whiteLabelOptions: false,
      slaGuarantee: false,
      dataExport: false
    },
    pro: {
      coreDetection: true,
      dashboardAlerts: true, // Real-time + priority
      emailNotifications: true, // Daily + urgent + summary
      alertHistory: true, // 180 days
      basicFiltering: true,
      advancedFiltering: true,
      csvExport: true, // Weekly
      apiAccess: true,
      customAlertThresholds: true, // Full
      prioritySupport: true, // Email (4h) + chat
      onboardingAssistance: true, // Guided
      multiUserAccess: true, // 10 users
      whiteLabelOptions: false,
      slaGuarantee: false,
      dataExport: true, // On request
    },
    enterprise: {
      coreDetection: true,
      dashboardAlerts: true, // Real-time + dedicated
      emailNotifications: true, // Custom frequency
      alertHistory: true, // Unlimited
      basicFiltering: true,
      advancedFiltering: true,
      csvExport: true, // Daily + custom
      apiAccess: true, // + higher limits
      customAlertThresholds: true, // Full + predictive
      prioritySupport: true, // Dedicated agent + SLA
      onboardingAssistance: true, // Custom + training
      multiUserAccess: true, // Unlimited + roles
      whiteLabelOptions: true, // Available
      slaGuarantee: true, // 99.9% uptime
      dataExport: true, // Automated + API
    }
  };

  const planFeatures = featureMatrix[plan.toLowerCase()];
  if (!planFeatures) {
    // Unknown plan, default to free tier features
    const freeFeatures: FeatureMatrix = {
      coreDetection: true,
      dashboardAlerts: false, // Weekly digest only in actual implementation
      emailNotifications: false, // Weekly digest only
      alertHistory: false, // 30 days
      basicFiltering: true,
      advancedFiltering: false,
      csvExport: false,
      apiAccess: false,
      customAlertThresholds: false,
      prioritySupport: false,
      onboardingAssistance: false,
      multiUserAccess: false,
      whiteLabelOptions: false,
      slaGuarantee: false,
      dataExport: false
    };
    return freeFeatures[feature];
  }

  return planFeatures[feature];
}

export default entitlementCheckMiddleware;