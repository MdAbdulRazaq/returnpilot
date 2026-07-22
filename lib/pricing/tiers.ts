// Pricing tiers configuration for ReturnPilot
// Based on PRICE-003: Set pricing tiers: Free ($0, 50 orders), Starter ($9, 200), Growth ($29, 1,000), Pro ($79, 5,000), Enterprise (custom)

// Define the feature set for each tier based on Section 6 of billing.md (Feature Matrix)
export interface PricingTier {
  id: string; // Unique identifier for the tier
  name: string; // Display name
  monthlyPriceCents: number; // Price in cents to avoid floating point issues
  annualPriceCents?: number; // Annual price in cents (if applicable)
  protectedOrdersLimit: number; // Monthly limit of protected orders
  features: {
    coreDetection: boolean;
    dashboardAlerts: string; // Description of dashboard alerts level
    emailNotifications: string; // Description of email notifications level
    alertHistoryDays: number; // Number of days of alert history retained
    basicFiltering: boolean;
    advancedFiltering: boolean;
    csvExport: string; // Description of CSV export frequency
    apiAccess: boolean; // Whether API access is included
    customAlertThresholds: string; // Description of custom alert thresholds availability
    prioritySupport: string; // Description of priority support level
    onboardingAssistance: string; // Description of onboarding assistance level
    multiUserAccess: string; // Description of multi-user access limit
    whiteLabelOptions: boolean; // Whether white-label options are available
    slaGuarantee: boolean; // Whether SLA guarantee is included
    dataExport: string; // Description of data export availability
    contractTerms: string; // Description of contract terms
  };
}

// Define the pricing tiers according to PRICE-003
export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    monthlyPriceCents: 0,
    protectedOrdersLimit: 50,
    features: {
      coreDetection: true,
      dashboardAlerts: "Weekly digest",
      emailNotifications: "Weekly",
      alertHistoryDays: 30,
      basicFiltering: true,
      advancedFiltering: false,
      csvExport: "None",
      apiAccess: false,
      customAlertThresholds: "None",
      prioritySupport: "None",
      onboardingAssistance: "None",
      multiUserAccess: "None",
      whiteLabelOptions: false,
      slaGuarantee: false,
      dataExport: "None",
      contractTerms: "N/A"
    }
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPriceCents: 900, // $9.00 in cents
    annualPriceCents: 9000, // $90.00 in cents (17% savings)
    protectedOrdersLimit: 200,
    features: {
      coreDetection: true,
      dashboardAlerts: "Daily digest",
      emailNotifications: "Daily",
      alertHistoryDays: 60,
      basicFiltering: true,
      advancedFiltering: false,
      csvExport: "None",
      apiAccess: false,
      customAlertThresholds: "None",
      prioritySupport: "Email (24h)",
      onboardingAssistance: "Self-serve",
      multiUserAccess: "1 user",
      whiteLabelOptions: false,
      slaGuarantee: false,
      dataExport: "None",
      contractTerms: "Monthly"
    }
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPriceCents: 2900, // $29.00 in cents
    annualPriceCents: 29000, // $290.00 in cents (17% savings)
    protectedOrdersLimit: 1000,
    features: {
      coreDetection: true,
      dashboardAlerts: "Daily digest + real-time",
      emailNotifications: "Daily + urgent",
      alertHistoryDays: 90,
      basicFiltering: true,
      advancedFiltering: true,
      csvExport: "Monthly",
      apiAccess: false,
      customAlertThresholds: "Basic",
      prioritySupport: "Email (12h)",
      onboardingAssistance: "Self-serve",
      multiUserAccess: "3 users",
      whiteLabelOptions: false,
      slaGuarantee: false,
      dataExport: "None",
      contractTerms: "Monthly"
    }
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPriceCents: 7900, // $79.00 in cents
    annualPriceCents: 79000, // $790.00 in cents (17% savings)
    protectedOrdersLimit: 5000,
    features: {
      coreDetection: true,
      dashboardAlerts: "Real-time + priority",
      emailNotifications: "Daily + urgent + summary",
      alertHistoryDays: 180,
      basicFiltering: true,
      advancedFiltering: true,
      csvExport: "Weekly",
      apiAccess: true,
      customAlertThresholds: "Full",
      prioritySupport: "Email (4h) + chat",
      onboardingAssistance: "Guided",
      multiUserAccess: "10 users",
      whiteLabelOptions: false,
      slaGuarantee: false,
      dataExport: "On request",
      contractTerms: "Monthly"
    }
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPriceCents: 0, // Custom pricing - to be set per contract
    protectedOrdersLimit: 5000, // Minimum, actually custom (5,000+)
    features: {
      coreDetection: true,
      dashboardAlerts: "Real-time + dedicated",
      emailNotifications: "Custom frequency",
      alertHistoryDays: 999999, // Unlimited (using large number)
      basicFiltering: true,
      advancedFiltering: true,
      csvExport: "Daily + custom",
      apiAccess: true, // + higher limits (handled elsewhere)
      customAlertThresholds: "Full + predictive",
      prioritySupport: "Dedicated agent + SLA",
      onboardingAssistance: "Custom + training",
      multiUserAccess: "Unlimited + roles",
      whiteLabelOptions: true,
      slaGuarantee: true,
      dataExport: "Automated + API",
      contractTerms: "Annual discounts available"
    }
  }
];

// Helper function to get tier by id
export function getTierById(id: string): PricingTier | undefined {
  return PRICING_TIERS.find(tier => tier.id === id);
}

// Helper function to validate if a tier exists
export function isValidTierId(id: string): boolean {
  return PRICING_TIERS.some(tier => tier.id === id);
}