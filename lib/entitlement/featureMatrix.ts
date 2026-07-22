// Feature matrix defining feature availability by plan tier
// Based on PRICE-004: Allocate features progressively across tiers per the feature matrix in Section 6 of billing.md
// This directly implements the feature matrix from billing.md Section 6

import { getTierById, PRICING_TIERS } from "../pricing/tiers";

/**
 * Feature availability matrix
 * This structure mirrors the feature matrix in Section 6 of billing.md
 */
export interface FeatureAvailability {
  coreDetection: boolean;
  dashboardAlerts: boolean; // Simplified to boolean for access control - actual level handled elsewhere
  emailNotifications: boolean; // Simplified to boolean for access control - actual level handled elsewhere
  alertHistory: boolean; // Simplified to boolean for access control - actual duration handled elsewhere
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
 * Get feature availability for a specific tier
 * @param tierId The pricing tier ID
 * @returns Feature availability object for the tier
 */
export function getFeatureAvailability(tierId: string): FeatureAvailability {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown pricing tier: ${tierId}`);
  }

  // Map the tier's features to boolean availability for access control purposes
  // Note: This simplifies the feature matrix to booleans for access control decisions
  // The actual levels/limits of features are handled by other systems
  return {
    coreDetection: tier.features.coreDetection === true,
    dashboardAlerts: tier.features.dashboardAlerts !== "None",
    emailNotifications: tier.features.emailNotifications !== "None",
    alertHistory: tier.features.alertHistoryDays > 0,
    basicFiltering: tier.features.basicFiltering === true,
    advancedFiltering: tier.features.advancedFiltering === true,
    csvExport: tier.features.csvExport !== "None",
    apiAccess: tier.features.apiAccess === true,
    customAlertThresholds:
      tier.features.customAlertThresholds !== "None" &&
      tier.features.customAlertThresholds !== "",
    prioritySupport: tier.features.prioritySupport !== "None",
    onboardingAssistance: tier.features.onboardingAssistance !== "None",
    multiUserAccess:
      tier.features.multiUserAccess !== "None",
    whiteLabelOptions: tier.features.whiteLabelOptions === true,
    slaGuarantee: tier.features.slaGuarantee === true,
    dataExport: tier.features.dataExport !== "None"
  };
}

/**
 * Check if a specific feature is available for a tier
 * @param tierId The pricing tier ID
 * @param feature The feature name to check
 * @returns Boolean indicating if the feature is available
 */
export function isFeatureAvailable(tierId: string, feature: keyof FeatureAvailability): boolean {
  const availability = getFeatureAvailability(tierId);
  return availability[feature];
}

/**
 * Get all tiers that have a specific feature available
 * @param feature The feature name to check
 * @returns Array of tier IDs that have the feature available
 */
export function getTiersWithFeature(feature: keyof FeatureAvailability): string[] {
  return PRICING_TIERS
    .filter(tier => {
      const availability = getFeatureAvailability(tier.id);
      return availability[feature] === true;
    })
    .map(tier => tier.id);
}

/**
 * Validate that the feature matrix matches the requirements in billing.md Section 6
 * This function can be used for testing to ensure correctness
 * @returns Boolean indicating if the feature matrix is valid
 */
export function validateFeatureMatrix(): boolean {
  try {
    // Check each tier in order: Free, Starter, Growth, Pro, Enterprise
    const free = getFeatureAvailability("free");
    const starter = getFeatureAvailability("starter");
    const growth = getFeatureAvailability("growth");
    const pro = getFeatureAvailability("pro");
    const enterprise = getFeatureAvailability("enterprise");

    // Free tier checks
    if (!free.coreDetection) return false;
    if (free.dashboardAlerts) return false; // Weekly digest only - but we're simplifying to boolean
    if (free.emailNotifications) return false; // Weekly only
    if (!free.alertHistory) return false; // 30 days
    if (!free.basicFiltering) return false;
    if (free.advancedFiltering) return false;
    if (free.csvExport) return false;
    if (free.apiAccess) return false;
    if (free.customAlertThresholds) return false;
    if (free.prioritySupport) return false;
    if (free.onboardingAssistance) return false;
    if (free.multiUserAccess) return false;
    if (free.whiteLabelOptions) return false;
    if (free.slaGuarantee) return false;
    if (free.dataExport) return false;

    // Starter tier checks
    if (!starter.coreDetection) return false;
    if (!starter.dashboardAlerts) return false; // Daily digest
    if (!starter.emailNotifications) return false; // Daily
    if (!starter.alertHistory) return false; // 60 days
    if (!starter.basicFiltering) return false;
    if (starter.advancedFiltering) return false;
    if (starter.csvExport) return false;
    if (starter.apiAccess) return false;
    if (starter.customAlertThresholds) return false;
    if (!starter.prioritySupport) return false; // Email (24h)
    if (!starter.onboardingAssistance) return false; // Self-serve
    if (!starter.multiUserAccess) return false; // 1 user
    if (starter.whiteLabelOptions) return false;
    if (starter.slaGuarantee) return false;
    if (starter.dataExport) return false;

    // Growth tier checks
    if (!growth.coreDetection) return false;
    if (!growth.dashboardAlerts) return false; // Daily digest + real-time
    if (!growth.emailNotifications) return false; // Daily + urgent
    if (!growth.alertHistory) return false; // 90 days
    if (!growth.basicFiltering) return false;
    if (!growth.advancedFiltering) return false;
    if (!growth.csvExport) return false; // Monthly
    if (growth.apiAccess) return false;
    if (!growth.customAlertThresholds) return false; // Basic
    if (!growth.prioritySupport) return false; // Email (12h)
    if (!growth.onboardingAssistance) return false; // Self-serve
    if (!growth.multiUserAccess) return false; // 3 users
    if (growth.whiteLabelOptions) return false;
    if (growth.slaGuarantee) return false;
    if (!growth.dataExport) return false;

    // Pro tier checks
    if (!pro.coreDetection) return false;
    if (!pro.dashboardAlerts) return false; // Real-time + priority
    if (!pro.emailNotifications) return false; // Daily + urgent + summary
    if (!pro.alertHistory) return false; // 180 days
    if (!pro.basicFiltering) return false;
    if (!pro.advancedFiltering) return false;
    if (!pro.csvExport) return false; // Weekly
    if (!pro.apiAccess) return false;
    if (!pro.customAlertThresholds) return false; // Full
    if (!pro.prioritySupport) return false; // Email (4h) + chat
    if (!pro.onboardingAssistance) return false; // Guided
    if (!pro.multiUserAccess) return false; // 10 users
    if (pro.whiteLabelOptions) return false;
    if (pro.slaGuarantee) return false;
    if (!pro.dataExport) return false; // On request

    // Enterprise tier checks
    if (!enterprise.coreDetection) return false;
    if (!enterprise.dashboardAlerts) return false; // Real-time + dedicated
    if (!enterprise.emailNotifications) return false; // Custom frequency
    if (!enterprise.alertHistory) return false; // Unlimited
    if (!enterprise.basicFiltering) return false;
    if (!enterprise.advancedFiltering) return false;
    if (!enterprise.csvExport) return false; // Daily + custom
    if (!enterprise.apiAccess) return false; // Yes + higher limits
    if (!enterprise.customAlertThresholds) return false; // Full + predictive
    if (!enterprise.prioritySupport) return false; // Dedicated agent + SLA
    if (!enterprise.onboardingAssistance) return false; // Custom + training
    if (!enterprise.multiUserAccess) return false; // Unlimited + roles
    if (!enterprise.whiteLabelOptions) return false; // Available
    if (!enterprise.slaGuarantee) return false; // 99.9% uptime
    if (!enterprise.dataExport) return false; // Automated + API

    return true; // All checks passed
  } catch (_err) {
    return false; // Validation failed
  }
}

/**
 * Get a human-readable description of a feature's availability for a tier
 * @param tierId The pricing tier ID
 * @param feature The feature name
 * @returns Description of feature availability
 */
export function getFeatureAvailabilityDescription(tierId: string, feature: keyof FeatureAvailability): string {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown pricing tier: ${tierId}`);
  }

  // This would ideally return the detailed description from the tier's features
  // For simplicity, we're returning a basic description
  const isAvailable = isFeatureAvailable(tierId, feature);

  // Map feature names to readable descriptions
  const featureNames: Record<keyof FeatureAvailability, string> = {
    coreDetection: "Core Detection",
    dashboardAlerts: "Dashboard Alerts",
    emailNotifications: "Email Notifications",
    alertHistory: "Alert History",
    basicFiltering: "Basic Filtering",
    advancedFiltering: "Advanced Filtering",
    csvExport: "CSV Export",
    apiAccess: "API Access",
    customAlertThresholds: "Custom Alert Thresholds",
    prioritySupport: "Priority Support",
    onboardingAssistance: "Onboarding Assistance",
    multiUserAccess: "Multi-user Access",
    whiteLabelOptions: "White-label Options",
    slaGuarantee: "SLA Guarantee",
    dataExport: "Data Export"
  };

  return `${featureNames[feature]}: ${isAvailable ? "Available" : "Not Available"}`;
}