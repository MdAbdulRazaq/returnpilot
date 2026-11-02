# Pricing & Plans - Package 4 Implementation Contract

## 1 Executive Summary

### Objective
Implement the pricing engine, plan management, and billing infrastructure to support ReturnPilot's hybrid tiered subscription model with usage-based components, enabling merchants to select plans, track usage against limits, and experience appropriate plan-based feature access and enforcement.

### Engineering Purpose
Build upon Packages 2 and 3's foundational billing infrastructure to add active plan management, pricing logic, upgrade/downgrade handling, trial management, and billing synchronization. This package transforms the usage tracking and enforcement foundation into a complete billing system that manages the merchant lifecycle from trial through paid subscription, including plan changes, cancellations, and renewals.

### Repository Context
Package 2 established the foundational Shopify Billing API integration and extended the shops table with billing fields. Package 3 added usage tracking enforcement and subscription validation. Package 4 builds directly upon this foundation to add plan management logic, pricing calculations, upgrade/downgrade flows, and trial lifecycle management.

## 2 Repository Evidence

| Path | Why It Matters | Dependency |
|------|----------------|------------|
| `lib/shopify/sync.ts` | Contains `isProtectedOrder` function and usage counting foundation from Package 2 | Required for usage-based pricing calculations |
| `lib/supabase/admin.ts` | Contains ShopRow interface with all billing fields and audit logging functions | Required for plan storage, subscription state, and usage tracking |
| `lib/shopify/billing.ts` | Shopify Billing API client wrapper from Package 2 | Required for actual billing operations via Shopify |
| `middleware/usageEnforcement.ts` | Package 3 middleware enforcing plan limits | Required for limiting access based on plan limits |
| `middleware/entitlementCheck.ts` | Package 3 middleware checking feature access | Required for gating features by plan tier |
| `middleware/subscriptionStatusCheck.ts` | Package 3 middleware verifying subscription status | Required for access control based on billing status |
| `services/subscriptionValidator.ts` | Package 3 service validating against Shopify | Required for ensuring local state matches Shopify |
| `jobs/usageResetJob.ts` | Package 3 job resetting usage counters | Required for monthly usage limit resets |
| `jobs/billingSyncJob.ts` | Package 3 job synchronizing with Shopify | Required for keeping subscription state current |
| `lib/usage/limitEvaluator.ts` | Package 3 module evaluating plan limits | Required for limit calculations in enforcement |
| `database/0005_billing_fields.sql` | Migration adding billing fields to shops table | Provides schema for plan storage and usage tracking |
| `lib/env.ts` | Environment variable validation framework | Will need to validate pricing-related configuration |

## 3 Scope

| Requirement | Repository Evidence | Product Owner Decision | Affected Subsystem |
|-------------|---------------------|------------------------|-------------------|
| Implement plan storage and retrieval logic for all tiers (Free, Starter, Growth, Pro, Enterprise) | `lib/supabase/admin.ts` (ShopRow plan field), `database/0005_billing_fields.sql` | PRICE-003 (pricing tiers), PRICE-015 (annual pricing discount) | Data layer, API routes |
| Create pricing engine that calculates charges based on selected plan and billing cycle | `lib/supabase/admin.ts` (billing fields), PRICE-003 | PRICE-003 (specific pricing amounts), PRICE-015 (annual discount) | Pricing service, billing calculations |
| Implement trial management including 14-day free trial with full Pro tier access | `lib/supabase/admin.ts` (trial fields), PRICE-005 | PRICE-005 (14-day trial with Pro access), PRICE-092 through PRICE-098 (trial conversion) | Trial service, middleware, API routes |
| Implement upgrade/downgrade logic with proration calculations | `lib/supabase/admin.ts` (plan and billing fields), PRICE-010/PRICE-011 | PRICE-010 (immediate upgrade effect), PRICE-011 (downgrade at next billing date), PRICE-078 through PRICE-091 (upgrade/downgrade behavior) | Pricing service, webhook handlers |
| Implement usage-based limit enforcement tied to Protected Orders metric | `lib/shopify/sync.ts` (isProtectedOrder), `middleware/usageEnforcement.ts` | PRICE-002 (Protected Orders as billing metric), PRICE-044 through PRICE-052 (usage limits) | Enforcement middleware, limit evaluator |
| Create entitlement system for feature access based on plan tier | `middleware/entitlementCheck.ts`, `lib/supabase/admin.ts` (plan field) | PRICE-004 (feature matrix allocation), PRICE-056 through PRICE-072 (feature matrix) | Entitlement middleware, feature gates |
| Implement automated usage reset at monthly billing cycle boundaries | `jobs/usageResetJob.ts`, `lib/supabase/admin.ts` (usage_reset_at field) | PRICE-009 (midnight UTC reset), PRICE-044 through PRICE-052 (reset frequency) | Background job, usage tracking |
| Implement billing state synchronization to keep local state aligned with Shopify | `jobs/billingSyncJob.ts`, `lib/shopify/billing.ts` | PRICE-001 (hybrid model), PRICE-044 through PRICE-052 (usage limits) | Synchronization jobs, API integration |
| Implement failed payment handling and recovery logic | `lib/supabase/admin.ts` (billing_active field), PRICE-012 | PRICE-012 (3-day/7-day retry attempts), PRICE-135 through PRICE-148 (failed payment handling) | Payment service, webhook handlers |
| Implement cancellation and re-subscription logic | `lib/supabase/admin.ts` (cancellation fields), PRICE-013 | PRICE-013 (immediate effect with access through period end), PRICE-099 through PRICE-112 (cancellation/re-subscription) | Subscription service, API routes |
| Implement data export availability based on plan tier | `lib/supabase/admin.ts` (data export logic), PRICE-027 | PRICE-027 (data export: Free/Starter/Growth:none, Pro:on request, Enterprise:automated+API) | Data export service, API routes |
| Implement SLA guarantee tracking for Enterprise tier | `lib/supabase/admin.ts` (SLA fields), PRICE-026 | PRICE-026 (SLA guarantee: Enterprise only, 99.9% uptime) | Monitoring service, Enterprise features |
| Implement multi-user access limits based on plan tier | `lib/supabase/admin.ts` (user management), PRICE-016/PRICE-024 | PRICE-016/PRICE-024 (user limits: Free:0, Starter:1, Growth:3, Pro:10, Enterprise:unlimited+roles) | User management service, API routes |
| Implement white-label options availability for Enterprise tier | `lib/supabase/admin.ts` (white-label field), PRICE-025 | PRICE-025 (white-label options: Enterprise only) | Branding service, API routes |
| Implement custom alert thresholds based on plan tier | `middleware/entitlementCheck.ts`, PRICE-021 | PRICE-021 (custom alert thresholds: Free/Starter:none, Growth:basic, Pro:full, Enterprise:full+predictive) | Alerting service, configuration API |
| Implement API access availability based on plan tier | `middleware/entitlementCheck.ts`, PRICE-020 | PRICE-020 (API access: Free/Starter/Growth:none, Pro:yes, Enterprise:yes+higher limits) | API gateway, rate limiting |
| Implement CSV export frequency based on plan tier | `lib/supabase/admin.ts` (export logic), PRICE-018 | PRICE-018 (CSV export: Free/Starter:none, Growth:monthly, Pro:weekly, Enterprise:daily+custom) | Export service, API routes |
| Implement alert history limits based on plan tier | `lib/supabase/admin.ts` (history limits), PRICE-017 | PRICE-017 (alert history: Free:30 days, Starter:60 days, Growth:90 days, Pro:180 days, Enterprise:unlimited) | Alerting service, storage cleanup |
| Implement priority support levels based on plan tier | `lib/supabase/admin.ts` (support fields), PRICE-022 | PRICE-022 (priority support: Free:none, Starter:email 24h, Growth:email 12h, Pro:email 4h+chat, Enterprise:dedicated agent+SLA) | Support service, notification system |
| Implement onboarding assistance levels based on plan tier | `lib/supabase/admin.ts` (onboarding fields), PRICE-023 | PRICE-023 (onboarding assistance: Free:none, Starter:self-serve, Growth:self-serve, Pro:guided, Enterprise:custom+training) | Onboarding service, tutorial system |
| Implement contract terms flexibility based on plan tier | `lib/supabase/admin.ts` (billing frequency), PRICE-028 | PRICE-028 (contract terms: Free:N/A, Starter/Growth/Pro:monthly, Enterprise:annual discounts) | Billing service, payment processing |
| Implement plan limit evaluation logic for all tiers | `lib/usage/limitEvaluator.ts`, PRICE-035 | PRICE-035 (plan limit evaluation logic), PRICE-044 through PRICE-052 (usage limits by tier) | Limit evaluation service, enforcement middleware |
| Implement usage limit warning notifications at 80% and 95% thresholds | `lib/usage/limitEvaluator.ts`, middleware | PRICE-007 (notifications at 80% and 95%), PRICE-180 through PRICE-192 (limit reached experience) | Notification service, middleware |
| Implement grace period behavior for paid tiers (10% before hard enforcement) | `middleware/usageEnforcement.ts`, PRICE-006 | PRICE-006 (10% grace period for paid tiers), PRICE-193 through PRICE-199 (grace period behavior) | Enforcement middleware, limit evaluator |
| Implement trial expiration grace period logic | `lib/supabase/admin.ts` (trial fields), PRICE-0202 through PRICE-0208 | PRICE-202 through PRICE-208 (trial expiration: Day 13 warning, Day 14 expiration, Days 15-21 grace period, Day 22 auto-transition to Free) | Trial service, middleware |
| Implement plan change behavior (same tier changes: monthly to annual) | `lib/supabase/admin.ts` (billing frequency), PRICE-0212 | PRICE-0212 (same tier changes handled as renewal with new commitment) | Billing service, API routes |
| Implement usage counter continuity through plan changes | `lib/supabase/admin.ts` (usage_current_period), PRICE-0213 | PRICE-0213 (usage counter continues accumulation through plan changes) | Usage tracking service |
| Implement plan limit change timing (upgrades immediate, downgrades at period start) | `lib/supabase/admin.ts` (plan fields), PRICE-0214 | PRICE-0214 (plan limits change immediately for upgrades, at period start for downgrades) | Limit evaluation service, enforcement middleware |
| Implement Shopify subscription cancellation detection and handling | `lib/shopify/webhooks.ts`, PRICE-0224 through PRICE-0230 | PRICE-224 through PRICE-230 ( Shopify subscription cancellation detected via webhook, immediate synchronization, access through paid period, clear messaging, win-back campaign) | Webhook handlers, subscription service |
| Implement billing sync failure handling and recovery logic | `jobs/billingSyncJob.ts`, PRICE-0231 through PRICE-0238 | PRICE-231 through PRICE-238 (failed webhook deliveries queued for retry, failed API calls queued with circuit breaker, automatic resume after >5 days missing data, backfill protected orders, no double-charging, clear notifications) | Synchronization jobs, error handling |
| Implement data export availability timing (30 days post-cancellation) | `lib/supabase/admin.ts` (export logic), PRICE-0158 | PRICE-158 (data export available for 30 days post-cancellation) | Data export service, cleanup routines |

## 4 Decision Traceability Matrix

| Product Decision | Repository Evidence | Implementation Item | Affected Files | Status |
|------------------|---------------------|---------------------|----------------|--------|
| PRICE-001: Adopt hybrid tiered subscription with usage components (predictable base + usage component) | Executive Summary, Pricing Philosophy | Hybrid pricing engine | `lib/pricing/pricingEngine.ts` (new), `lib/usage/limitEvaluator.ts` (reference) | To be implemented |
| PRICE-002: Use Protected Orders (orders containing at least one refund line item in 60-day lookback window) as primary billing metric | Usage Limits, Business Goals | Usage-based billing metric | `lib/shopify/sync.ts` (isProtectedOrder function), `middleware/usageEnforcement.ts` | ✓ Implemented (Package 2/3) |
| PRICE-003: Set pricing tiers: Free ($0, 50 orders), Starter ($9, 200), Growth ($29, 1,000), Pro ($79, 5,000), Enterprise (custom) | Plan Definitions, Usage Limits | Pricing tier configuration | `lib/pricing/tiers.ts` (new), `lib/supabase/admin.ts` (reference) | To be implemented |
| PRICE-004: Allocate features progressively across tiers per the feature matrix in Section 6 of billing.md | Feature Matrix | Feature entitlement system | `middleware/entitlementCheck.ts` (reference), `lib/entitlement/featureMatrix.ts` (new) | Partially implemented (Package 3) |
| PRICE-005: Set trial duration to 14 days with full Pro tier access | Billing Rules (Trial Rules) | Trial management system | `lib/supabase/admin.ts` (reference), `lib/trial/trialManager.ts` (new), `middleware/trialCheck.ts` (new) | To be implemented |
| PRICE-006: Implement 10% grace period before hard enforcement for paid tiers (Free tier has no grace period) | Usage Limits (Overage Policy) | Grace period logic | `middleware/usageEnforcement.ts` (reference), `lib/usage/gracePeriod.ts` (new) | Partially implemented (Package 3) |
| PRICE-007: Send notifications at 80% and 95% of usage limit (email and in-app banner) | Merchant Experience (Warning Messages) | Usage limit notifications | `lib/notifications/usageWarnings.ts` (new), `lib/usage/limitEvaluator.ts` (reference) | To be implemented |
| PRICE-008: Block new protection processing after exceeding grace period limit; maintain access to existing alerts | Merchant Experience (Limit Reached Experience) | Limit enforcement behavior | `middleware/usageEnforcement.ts` (reference), `lib/usage/limitEnforcer.ts` (new) | Partially implemented (Package 3) |
| PRICE-009: Reset usage counters at midnight UTC on first day of each calendar month | Usage Limits (Reset Frequency) | Automated usage reset | `jobs/usageResetJob.ts` (reference), `lib/usage/resetScheduler.ts` (new) | Partially implemented (Package 3) |
| PRICE-010: Set upgrade behavior to immediate effect with prorated charges | Upgrade & Downgrade Policy (Upgrade Behavior) | Upgrade logic with proration | `lib/pricing/upgradeDowngrade.ts` (new), `lib/supabase/admin.ts` (reference) | To be implemented |
| PRICE-011: Set downgrade behavior to effective at next billing date with prorated credits | Upgrade & Downgrade Policy (Downgrade Behavior) | Downgrade logic with proration | `lib/pricing/upgradeDowngrade.ts` (new), `lib/supabase/admin.ts` (reference) | To be implemented |
| PRICE-012: Define failed payment handling: 3-day and 7-day retry attempts, suspension after 3 failures | Billing Rules (Failed Payment Handling) | Failed payment handling system | `lib/payments/failedPaymentHandler.ts` (new), `lib/supabase/admin.ts` (reference) | To be implemented |
| PRICE-013: Set cancellation timing to immediate effect with access through end of paid period | Upgrade & Downgrade Policy (Cancellation) | Cancellation and re-subscription logic | `lib/subscriptions/cancellationManager.ts` (new), `lib/supabase/admin.ts` (reference) | To be implemented |
| PRICE-014: Define refund policy: no prorated refunds within billing period, service continues only for billing errors, paid period, data export available for 30 days post-cancellation | Billing Rules (Refund Policy) | Refund policy implementation | `lib/payments/refundPolicy.ts` (new), `lib/supabase/admin.ts` (reference) | To be implemented |
| PRICE-015: Set annual pricing discount to 17% (2 months free) for annual commitments | Plan Definitions (Annual Price column) | Annual pricing discount logic | `lib/pricing/annualDiscount.ts` (new), `lib/supabase/admin.ts` (reference) | To be implemented |
| PRICE-016: Set multi-user access limits: Free (0), Starter (1), Growth (3), Pro (10), Enterprise (unlimited + roles) | Feature Matrix (Multi-user Access) | Multi-user access control | `lib/supabase/admin.ts` (reference), `lib/users/accessControl.ts` (new) | To be implemented |
| PRICE-017: Set alert history limits: Free (30 days), Starter (60 days), Growth (90 days), Pro (180 days), Enterprise (unlimited) | Feature Matrix (Alert History) | Alert history limits | `lib/supabase/admin.ts` (reference), `lib/alerts/historyManager.ts` (new) | To be implemented |
| PRICE-018: Set CSV export frequency: Free (none), Starter (none), Growth (monthly), Pro (weekly), Enterprise (daily + custom) | Feature Matrix (CSV Export) | CSV export frequency control | `lib/supabase/admin.ts` (reference), `lib/export/csvScheduler.ts` (new) | To be implemented |
| PRICE-019: Set advanced filtering availability: Free (no), Starter (no), Growth (yes), Pro (yes), Enterprise (yes) | Feature Matrix (Advanced Filtering) | Advanced filtering access control | `middleware/entitlementCheck.ts` (reference), `lib/features/advancedFilteringGate.ts` (new) | To be implemented |
| PRICE-020: Set API access availability: Free (no), Starter (no), Growth (no), Pro (yes), Enterprise (yes + higher limits) | Feature Matrix (API Access) | API access control | `middleware/entitlementCheck.ts` (reference), `lib/api/accessControl.ts` (new) | To be implemented |
| PRICE-021: Set custom alert thresholds availability: Free (no), Starter (no), Growth (basic), Pro (full), Enterprise (full + predictive) | Feature Matrix (Custom Alert Thresholds) | Custom alert thresholds control | `middleware/entitlementCheck.ts` (reference), `lib/alerts/customThresholdsGate.ts` (new) | To be implemented |
| PRICE-022: Set priority support levels: Free (none), Starter (email 24h), Growth (email 12h), Pro (email 4h + chat), Enterprise (dedicated agent + SLA) | Feature Matrix (Priority Support) | Priority support levels | `lib/supabase/admin.ts` (reference), `lib/support/priorityLevels.ts` (new) | To be implemented |
| PRICE-023: Set onboarding assistance levels: Free (none), Starter (self-serve), Growth (self-serve), Pro (guided), Enterprise (custom + training) | Feature Matrix (Onboarding Assistance) | Onboarding assistance levels | `lib/supabase/admin.ts` (reference), `lib/onboarding/assistanceLevels.ts` (new) | To be implemented |
| PRICE-024: Set multi-user access limits: Free (none), Starter (1 user), Growth (3 users), Pro (10 users), Enterprise (unlimited + roles) | Feature Matrix (Multi-user Access) | Multi-user access limits (duplicate of PRICE-016) | `lib/supabase/admin.ts` (reference), `lib/users/accessControl.ts` (new) | To be implemented |
| PRICE-025: Set white-label options availability: Free (no), Starter (no), Growth (no), Pro (no), Enterprise (yes) | Feature Matrix (White-label Options) | White-label options control | `lib/supabase/admin.ts` (reference), `lib/branding/whiteLabelManager.ts` (new) | To be implemented |
| PRICE-026: Set SLA guarantee availability: Free (no), Starter (no), Growth (no), Pro (no), Enterprise (yes, 99.9% uptime) | Feature Matrix (SLA Guarantee) | SLA guarantee tracking | `lib/supabase/admin.ts` (reference), `lib/monitoring/slaTracker.ts` (new) | To be implemented |
| PRICE-027: Set data export availability: Free (none), Starter (none), Growth (none), Pro (on request), Enterprise (automated + API) | Feature Matrix (Data Export) | Data export availability | `lib/supabase/admin.ts` (reference), `lib/export/dataExportManager.ts` (new) | To be implemented |
| PRICE-028: Set contract terms: Free (N/A), Starter (monthly), Growth (monthly), Pro (monthly), Enterprise (annual discounts available) | Feature Matrix (Contract Terms) | Contract terms flexibility | `lib/supabase/admin.ts` (reference), `lib/billing/contractTermsManager.ts` (new) | To be implemented |

## 5 Files Expected Files To Change

| File | Reason | Risk | Existing/New |
|------|--------|------|--------------|
| `lib/pricing/tiers.ts` | New module defining pricing tiers and their properties (price, limits, feature sets) | Low - isolated configuration module | New |
| `lib/pricing/pricingEngine.ts` | New module calculating charges based on plan and billing cycle | Medium - contains billing logic requiring accuracy | New |
| `lib/pricing/upgradeDowngrade.ts` | New module handling plan changes with proration calculations | Medium - financial logic requires precision and testing | New |
| `lib/pricing/annualDiscount.ts` | New module calculating annual pricing discounts | Low - simple percentage calculation | New |
| `lib/trial/trialManager.ts` | New module managing 14-day trial lifecycle with full Pro access | Medium - involves date calculations and state transitions | New |
| `middleware/trialCheck.ts` | New middleware checking trial status for access control | Low - builds on existing subscription status check patterns | New |
| `lib/usage/gracePeriod.ts` | New module implementing 10% grace period logic for paid tiers | Low - builds on existing limit evaluator | New |
| `lib/usage/limitEnforcer.ts` | New module blocking new protection processing after limit exceeded | Low - builds on existing usage enforcement middleware | New |
| `lib/usage/resetScheduler.ts` | New module scheduling usage resets at monthly boundaries | Low - builds on existing usage reset job | New |
| `lib/notifications/usageWarnings.ts` | New module sending notifications at 80% and 95% usage limits | Low - builds on existing notification infrastructure | New |
| `lib/entitlement/featureMatrix.ts` | New module defining feature availability by plan tier per Section 6 of billing.md | Low - direct implementation of feature matrix | New |
| `lib/features/advancedFilteringGate.ts` | New module gating advanced filtering feature access | Low - builds on existing entitlement check middleware | New |
| `lib/api/accessControl.ts` | New module gating API access based on plan tier | Low - builds on existing entitlement check middleware | New |
| `lib/alerts/customThresholdsGate.ts` | New module gating custom alert thresholds feature access | Low - builds on existing entitlement check middleware | New |
| `lib/support/priorityLevels.ts` | New module defining priority support levels by plan tier | Low - builds on existing entitlement check middleware | New |
| `lib/onboarding/assistanceLevels.ts` | New module defining onboarding assistance levels by plan tier | Low - builds on existing entitlement check middleware | New |
| `lib/branding/whiteLabelManager.ts` | New module managing white-label options for Enterprise tier | Low - simple feature flag implementation | New |
| `lib/monitoring/slaTracker.ts` | New module tracking SLA metrics for Enterprise tier | Low - builds on existing monitoring infrastructure | New |
| `lib/export/dataExportManager.ts` | New module managing data export availability by plan tier | Low - builds on existing export infrastructure | New |
| `lib/export/csvScheduler.ts` | New module scheduling CSV exports by plan tier frequency | Low - builds on existing export infrastructure | New |
| `lib/alerts/historyManager.ts` | New module managing alert history limits by plan tier | Low - builds on existing alert storage | New |
| `lib/payments/failedPaymentHandler.ts` | New module implementing 3-day/7-day retry attempts and suspension logic | Medium - involves payment retry logic and state management | New |
| `lib/payments/refundPolicy.ts` | New module implementing refund policy (no prorated refunds, billing errors only) | Low - straightforward policy implementation | New |
| `lib/subscriptions/cancellationManager.ts` | New module managing cancellation and re-subscription logic | Medium - involves state transitions and data export timing | New |
| `lib/billing/contractTermsManager.ts` | New module managing contract terms flexibility (monthly/annual) | Low - builds on existing billing infrastructure | New |
| `lib/supabase/admin.ts` | Reference for ShopRow interface with billing fields (no changes needed) | None - read-only reference | Existing |
| `lib/shopify/sync.ts` | Reference for isProtectedOrder function (no changes needed) | None - read-only reference | Existing |
| `middleware/usageEnforcement.ts` | Reference for existing usage enforcement (no changes needed) | None - read-only reference | Existing |
| `middleware/entitlementCheck.ts` | Reference for existing entitlement checks (no changes needed) | None - read-only reference | Existing |
| `middleware/subscriptionStatusCheck.ts` | Reference for existing subscription status checks (no changes needed) | None - read-only reference | Existing |
| `services/subscriptionValidator.ts` | Reference for existing subscription validation (no changes needed) | None - read-only reference | Existing |
| `jobs/usageResetJob.ts` | Reference for existing usage reset job (no changes needed) | None - read-only reference | Existing |
| `jobs/billingSyncJob.ts` | Reference for existing billing sync job (no changes needed) | None - read-only reference | Existing |
| `lib/usage/limitEvaluator.ts` | Reference for existing limit evaluation logic (no changes needed) | None - read-only reference | Existing |

## 6 Implementation Order

| Prerequisite | Implementation | Validation | Expected Result |
|--------------|----------------|------------|-----------------|
| Packages 2 & 3 foundation (billing fields, usage counting, entitlement checks, usage enforcement, subscription validation, usage reset, billing sync) | Create `lib/pricing/tiers.ts` defining all pricing tiers with prices, limits, and feature sets | Unit tests verifying correct tier properties and limits | Accurate tier configuration accessible throughout system |
| Packages 2 & 3 foundation + `lib/pricing/tiers.ts` | Create `lib/pricing/pricingEngine.ts` calculating charges based on selected plan and billing cycle | Unit tests verifying correct pricing calculations for all tiers and billing cycles | Accurate charge calculation for plan selection and billing |
| Packages 2 & 3 foundation + pricing modules | Create `lib/pricing/upgradeDowngrade.ts` handling plan changes with proration calculations per PRICE-010/PRICE-011 | Unit tests verifying correct proration for upgrades/downgrades at various billing cycle points | Financially accurate plan transitions with proper credits/charges |
| Packages 2 & 3 foundation + pricing modules | Create `lib/pricing/annualDiscount.ts` calculating 17% annual discount | Unit tests verifying correct discount application | 17% discount applied to annual commitments |
| Packages 2 & 3 foundation + trial-related fields in ShopRow | Create `lib/trial/trialManager.ts` managing 14-day trial lifecycle with full Pro tier access per PRICE-005 | Unit tests verifying trial state transitions and feature access | Correct trial behavior: 14 days full Pro access, then transition to Free |
| Packages 2 & 3 foundation + trial manager | Create `middleware/trialCheck.ts` middleware checking trial status for access control | Unit tests verifying trial-aware access control | Trial status properly considered in access decisions |
| Packages 2 & 3 foundation + usage enforcement | Create `lib/usage/gracePeriod.ts` implementing 10% grace period logic for paid tiers per PRICE-006 | Unit tests verifying grace period behavior (no enforcement within 10% over limit) | Proper grace period enforcement for paid tiers |
| Packages 2 & 3 foundation + usage enforcement | Create `lib/usage/limitEnforcer.ts` blocking new protection processing after limit exceeded per PRICE-008 | Unit tests verifying limit enforcement behavior | New alerts blocked after grace period exceeded, existing alerts accessible |
| Packages 2 & 3 foundation + usage reset job | Create `lib/usage/resetScheduler.ts` scheduling usage resets at monthly boundaries per PRICE-009 | Unit tests verifying correct scheduling at midnight UTC monthly | Usage counters reset reliably at billing cycle boundaries |
| Packages 2 & 3 foundation + limit evaluator | Create `lib/notifications/usageWarnings.ts` sending notifications at 80% and 95% usage limits per PRICE-007 | Unit tests verifying notification timing and content | Timely warnings sent as usage approaches limits |
| Packages 2 & 3 foundation + entitlement checks | Create `lib/entitlement/featureMatrix.ts` defining feature availability by plan tier per Section 6 of billing.md per PRICE-004 | Unit tests verifying correct feature allocation across tiers | Accurate feature gating matching billing.md feature matrix |
| Packages 2 & 3 foundation + entitlement checks + feature matrix | Create `lib/features/advancedFilteringGate.ts` gating advanced filtering feature access per PRICE-019 | Unit tests verifying correct access control for advanced filtering | Advanced filtering accessible only to Growth+ tiers |
| Packages 2 & 3 foundation + entitlement checks | Create `lib/api/accessControl.ts` gating API access based on plan tier per PRICE-020 | Unit tests verifying correct API access control | API access restricted to Pro+ tiers |
| Packages 2 & 3 foundation + entitlement checks | Create `lib/alerts/customThresholdsGate.ts` gating custom alert thresholds feature access per PRICE-021 | Unit tests verifying correct thresholds access control | Thresholds accessibility matching feature matrix (Growth:basic, Pro:full, Enterprise:full+predictive) |
| Packages 2 & 3 foundation + entitlement checks | Create `lib/support/priorityLevels.ts` defining priority support levels by plan tier per PRICE-022 | Unit tests verifying correct support level allocation | Support levels matching feature matrix across tiers |
| Packages 2 & 3 foundation + entitlement checks | Create `lib/onboarding/assistanceLevels.ts` defining onboarding assistance levels by plan tier per PRICE-023 | Unit tests verifying correct onboarding assistance allocation | Onboarding assistance matching feature matrix across tiers |
| Packages 2 & 3 foundation | Create `lib/branding/whiteLabelManager.ts` managing white-label options for Enterprise tier per PRICE-025 | Unit tests verifying white-label availability control | White-label options available only to Enterprise tier |
| Packages 2 & 3 foundation | Create `lib/monitoring/slaTracker.ts` tracking SLA metrics for Enterprise tier per PRICE-026 | Unit tests verifying SLA tracking logic | SLA metrics tracked and reported for Enterprise tier |
| Packages 2 & 3 foundation | Create `lib/export/dataExportManager.ts` managing data export availability by plan tier per PRICE-027 | Unit tests verifying data export rules | Data export: Free/Starter/Growth:none, Pro:on request, Enterprise:automated+API |
| Packages 2 & 3 foundation | Create `lib/export/csvScheduler.ts` scheduling CSV exports by plan tier frequency per PRICE-018 | Unit tests verifying CSV export scheduling | Correct export frequency: Growth:monthly, Pro:weekly, Enterprise:daily+custom |
| Packages 2 & 3 foundation | Create `lib/alerts/historyManager.ts` managing alert history limits by plan tier per PRICE-017 | Unit tests verifying alert history limits | Correct retention: Free:30 days, Starter:60 days, Growth:90 days, Pro:180 days, Enterprise:unlimited |
| Packages 2 & 3 foundation + payment-related fields | Create `lib/payments/failedPaymentHandler.ts` implementing 3-day/7-day retry attempts and suspension logic per PRICE-012 | Unit tests verifying failed payment handling flow | Correct retry timing and suspension after 3 failures |
| Packages 2 & 3 foundation + refund policy logic | Create `lib/payments/refundPolicy.ts` implementing refund policy per PRICE-014 | Unit tests verifying refund policy implementation | Refunds only for billing errors, no prorated refunds within period |
| Packages 2 & 3 foundation + cancellation-related fields | Create `lib/subscriptions/cancellationManager.ts` managing cancellation and re-subscription logic per PRICE-013 | Unit tests verifying cancellation/re-subscription logic | Immediate cancellation with access through period end, re-subscription as new merchant |
| Packages 2 & 3 foundation + billing frequency logic | Create `lib/billing/contractTermsManager.ts` managing contract terms flexibility per PRICE-028 | Unit tests verifying monthly/annual term handling | Proper handling of monthly vs annual commitments with discounts |
| All modules implemented | Run full test suite: `npm test` | All tests pass | No regressions in existing functionality; new pricing features tested |
| All modules implemented | Run typecheck: `npm run typecheck` | No TypeScript errors | Strong typing maintained throughout new implementation |
| All modules implemented | Run lint: `npm run lint` | No linting errors | Code follows project styling conventions |
| All modules implemented | Run build: `npm run build` | Successful production build | Application bundles correctly for deployment |

## 7 Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Financial Risk: Pricing Calculation Errors** | Errors in proration, discount, or tax calculations could lead to incorrect billing | - Implement comprehensive unit tests for all pricing calculations<br>- Use fixed-point arithmetic for currency values<br>- Peer review of financial logic<br>- Test edge cases: trial conversions, mid-cycle changes, cancellations |
| **Technical Risk: State Inconsistency During Plan Changes** | Incorrect handling of plan transitions could cause access or billing issues | - Implement atomic plan change transactions<br>- Add validation checks before and after plan transitions<br>- Provide rollback mechanisms for failed transitions<br>- Log all plan changes for audit and debugging |
| **Operational Risk: Trial Abuse** | Merchants could repeatedly reinstall to extend trial periods | - Track trial history via Shopify permanent shop ID<br>- Implement fair usage limits on trial extensions<br>- Combine with offline signals (payment history, store age) for trial eligibility |
| **Compliance Risk: Incorrect Tax Handling** | Failure to properly handle regional tax requirements could lead to legal issues | - Defer tax calculation to Shopify Billing API where possible<br>- Clearly document tax responsibility boundaries<br>- Consult with tax specialists for jurisdiction-specific requirements |
| **Performance Risk: Feature Evaluation Latency** | Frequent entitlement checks could increase request latency | - Cache entitlement decisions with appropriate TTL<br>- Implement efficient lookup structures for feature matrix<br>- Benchmark entitlement check performance<br>- Keep hot-path logic minimal and focused |
| **Migration Risk: Existing Merchant Transition** | Moving existing merchants to new pricing model could cause confusion or churn | - Provide clear migration communication<br>- Offer migration incentives or grace periods<br>- Ensure seamless transition with no service interruption<br>- Monitor merchant feedback during migration period |
| **Technical Risk: Webhook Handling Complexity** | Increased webhook volume from billing events could overwhelm processing | - Implement webhook queuing with retry mechanisms<br>- Add idempotency keys to prevent duplicate processing<br>- Monitor webhook processing lag and scale accordingly<br>- Implement circuit breaker for downstream service failures |
| **User Experience Risk: Confusing Limit Messaging** | Merchants may not understand why protection is blocked despite being under nominal limit | - Provide clear in-app explanations of grace period and limit calculations<br>- Show real-time usage metrics vs. limits with visual indicators<br>- Offer contextual help and documentation access<br>- A/B test messaging clarity and effectiveness |

## 8 Testing Strategy

### Unit Tests
- `lib/pricing/tiers.test.ts` - Test tier configuration and properties
- `lib/pricing/pricingEngine.test.ts` - Test pricing calculations for all tiers and cycles
- `lib/pricing/upgradeDowngrade.test.ts` - Test plan change logic with proration
- `lib/pricing/annualDiscount.test.ts` - Test annual discount calculations
- `lib/trial/trialManager.test.ts` - Test trial lifecycle and state transitions
- `middleware/trialCheck.test.ts` - Test trial-aware access control
- `lib/usage/gracePeriod.test.ts` - Test grace period logic for paid tiers
- `lib/usage/limitEnforcer.test.ts` - Test limit enforcement after grace period exceeded
- `lib/usage/resetScheduler.test.ts` - Test monthly usage reset scheduling
- `lib/notifications/usageWarnings.test.ts` - Test 80% and 95% usage limit notifications
- `lib/entitlement/featureMatrix.test.ts` - Test feature allocation per billing.md matrix
- `lib/features/advancedFilteringGate.test.ts` - Test advanced filtering access control
- `lib/api/accessControl.test.ts` - Test API access restriction to Pro+ tiers
- `lib/alerts/customThresholdsGate.test.ts` - Test custom alerts access per feature matrix
- `lib/support/priorityLevels.test.ts` - Test priority support level allocation
- `lib/onboarding/assistanceLevels.test.ts` - Test onboarding assistance allocation per matrix
- `lib/branding/whiteLabelManager.test.ts` - Test white-label Enterprise-only availability
- `lib/monitoring/slaTracker.test.ts` - Test SLA metrics tracking for Enterprise
- `lib/export/dataExportManager.test.ts` - Test data export availability rules
- `lib/export/csvScheduler.test.ts` - Test CSV export frequency scheduling
- `lib/alerts/historyManager.test.ts` - Test alert history limits per tier
- `lib/payments/failedPaymentHandler.test.ts` - Test 3-day/7-day retry and suspension logic
- `lib/payments/refundPolicy.test.ts` - Test refund policy (billing errors only)
- `lib/subscriptions/cancellationManager.test.ts` - Test cancellation and re-subscription logic
- `lib/billing/contractTermsManager.test.ts` - Test monthly/annual term handling

### Integration Tests
- Test end-to-end flow: plan selection → billing → usage accumulation → limit enforcement → reset
- Test trial → paid conversion with proper billing initiation
- Test upgrade/downgrade scenarios at various billing cycle points
- Test failed payment handling and recovery flows
- Test cancellation and data export availability timing
- Test entitlement checks across all feature/tier combinations
- Test white-label and SLA features exclusive to Enterprise
- Test contract terms changes (monthly to annual) with discount application

### Manual Verification
- Verify correct plan pricing and billing
- Confirm trial provides full Pro access for 14 days
- Check that upgrades take effect immediately with proper proration
- Verify downgrades take effect at next billing date with prorated credit
- Confirm failed payment follows 3-day/7-day retry then suspension
- Validate that cancellation provides access through period end
- Check that data export availability matches tier specifications
- Confirm SLA and white-label features are Enterprise-only
- Verify usage limit warnings at 80% and 95% thresholds
- Check grace period behavior (10% for paid tiers, none for Free)
- Test CSV export frequency matches tier specifications
- Validate alert history limits per tier are enforced
- Confirm entitlement checks properly gate features by tier

### Regression Testing
- Full existing test suite: `npm test` (should pass 43+ existing tests)
- TypeScript typecheck: `npm run typecheck` (should pass with no new errors)
- Linting: `npm run lint` (should pass with no new errors)
- Build verification: `npm run build` (should produce successful production bundle)

### Package-Specific Validation Steps
1. **Pricing Test**: Verify all tier prices and limits match PRICE-003
2. **Trial Test**: Confirm 14-day trial with full Pro access, then transition to Free
3. **Upgrade/Downgrade Test**: Test proration calculations at various billing points
4. **Failed Payment Test**: Verify 3-day/7-day retry attempts then suspension after 3 failures
5. **Cancellation Test**: Confirm immediate effect with access through period end
6. **Entitlement Test**: Validate feature access matches billing.md feature matrix
7. **Usage Limit Test**: Check warnings at 80%/95% and enforcement after grace period
8. **Reset Timing Test**: Verify usage counters reset at midnight UTC monthly
9. **White-label/SLA Test**: Confirm Enterprise-only features
10. **Contract Terms Test**: Verify monthly/annual handling with 17% discount

### Exact Repository Commands
```bash
# Unit tests
npm test

# TypeScript checking
npm run typecheck

# Linting
npm run lint

# Build verification
npm run build

# Package-specific validation (to be implemented as test scripts)
npm run test:pricing -- --testNamePattern="pricing"
npm run test:trial -- --testNamePattern="trial"
npm run test:upgradeDowngrade -- --testNamePattern="upgrade dowgrade"
npm run test:failedPayment -- --testNamePattern="failed payment"
npm run test:cancellation -- --testNamePattern="cancellation"
npm run test:entitlement -- --testNamePattern="entitlement"
npm run test:usageLimits -- --testNamePattern="usage limits"
```

## 9 Rollback Strategy

### If Deployment Fails:
1. **Immediate Response**: 
   - Stop routing traffic to new deployment
   - Alert engineering team via monitoring systems
   - Preserve logs for forensic analysis

2. **Rollback Procedure**:
   - Redeploy previous known-good version (Packages 2 & 3 foundation)
   - No database rollback required (changes are additive and backward compatible)
   - Verify health checks pass for core functionality (auth, sync, detection, enforcement)
   - Confirm existing merchants can still access dashboard and settings

3. **Recovery Verification**:
   - Core authentication flow: `/api/auth/callback` successful
   - Sync functionality: `/api/sync` processes shops without errors
   - Detection engine: Existing alerts still generated correctly
   - Settings API: `/api/settings` GET/POST works for non-billing and billing fields
   - Webhook processing: Existing webhooks (refunds/create, app/uninstalled, billing) still functional
   - Health check endpoint returns valid status

### Specific Considerations for This Package:
- **Pricing Engine Addition**: New pricing logic can be safely removed by redeploying previous version
- **Feature Modules**: New entitlement and feature gating modules can be disabled without affecting core
- **Trial System**: New trial management can be bypassed by configuration if needed
- **Payment Handling**: New failed payment logic has safe defaults and falls back to basic behavior
- **Database**: No schema changes required (uses existing billing fields from Package 2)
- **Backward Compatibility**: All changes designed to be backward compatible:
  - New middleware fails open (allows access) if configuration is missing
  - Background jobs have safe defaults and error handling
  - Existing functionality unaffected by new pricing layers
  - Free tier behavior preserved as baseline
- **Feature Flags**: Not required as changes are backward compatible additive; premium features can be disabled via configuration

## 10 Definition of Done

| Acceptance Criterion | Measurement Method |
|----------------------|-------------------|
| ✓ Pricing tiers correctly implemented | Manual test: Verify Free($0,50), Starter($9,200), Growth($29,1,000), Pro($79,5,000), Enterprise(custom) pricing and limits |
| ✓ Trial management functional | Manual test: Install → 14 days full Pro access → auto-transition to Free if no payment |
| ✓ Upgrade/downgrade logic correct | Manual test: Change plans at various points, verify proration and effective timing |
| ✓ Failed payment handling works | Manual test: Simulate payment failures, verify 3-day/7-day retries then suspension |
| ✓ Cancellation and re-subscription logic correct | Manual test: Cancel → verify access through period end → re-subscribe as new merchant |
| ✓ Entitlement checks match feature matrix | Manual test: Attempt to access each feature from each tier, verify correct access per billing.md Section 6 |
| ✓ Usage limit warnings at 80%/95% functional | Manual test: Accumulate usage, verify notifications at thresholds |
| ✓ Grace period behavior correct (10% for paid tiers) | Manual test: Exceed limit by <10%, verify continued processing; exceed by >10%, verify blocking |
| ✓ Usage counters reset at monthly boundaries | Manual test: Verify reset occurs at midnight UTC on first of month |
| ✓ White-label and SLA features Enterprise-only | Manual test: Attempt to access from non-Enterprise tiers, verify restriction |
| ✓ Data export availability matches tier specs | Manual test: Verify Free/Starter/Growth:none, Pro:on request, Enterprise:automated+API |
| ✓ CSV export frequency matches tier specs | Manual test: Verify Growth:monthly, Pro:weekly, Enterprise:daily+custom scheduling |
| ✓ Alert history limits enforced per tier | Manual test: Verify Free:30 days, Starter:60 days, Growth:90 days, Pro:180 days, Enterprise:unlimited retention |
| ✓ No regression in existing functionality | Test suite: `npm test` passes all existing tests; Build: `npm run build` succeeds |
| ✓ Pricing engine performs adequately | Performance testing: Pricing calculations add <10ms latency to plan operations |
| ✓ Edge cases handled properly | Unit tests: Boundary conditions (trial expiration, plan changes at period boundaries, etc.) handled correctly |
| ✓ Logging and monitoring effective | Manual verification: Pricing and billing decisions logged appropriately for audit |
| ✓ Configuration validation works | Unit tests: Validation fails appropriately for missing/invalid pricing config |

## 11 Engineering Readiness

**READY FOR IMPLEMENTATION**

### Justification:
All prerequisites for Package 4 implementation are satisfied:
1. **Repository is source of truth**: Packages 2 & 3 foundation is fully implemented and verified
2. **Product Owner documents are authoritative**: 
   - All PRICE-001 through PRICE-028 decisions are documented in pricing_strategy.md
   - These decisions provide complete specification for Package 4 engineering implementation
3. **No outstanding blockers**: 
   - All necessary business decisions for Package 4 have been made (per Section 7 of pricing_strategy.md)
   - Outstanding items in pricing strategy are risks and open questions, not blockers to implementation
4. **Repository does not contradict Product Owner documents**: 
   - Existing Packages 2 & 3 foundation provides all necessary components for Package 4 implementation
   - No work proposed exceeds the scope defined in Package Goals section
   - All implementation items map to approved Product Owner decisions (PRICE-001 through PRICE-028)
5. **Ambiguity resolved**: 
   - Scope explicitly defined as pricing and plans only (no new detection algorithms, analytics engines, etc.)
   - Implementation order follows logical dependencies
   - Risks identified with concrete mitigations
   - Definition of Done includes objective, measurable criteria

Engineering may proceed with implementation of Package 4: Pricing & Plans immediately, as all Product Owner decisions affecting this package have been DOCUMENTED and the technical foundation exists in Packages 2 & 3. The risks identified in the pricing strategy pertain to post-launch validation and optimization, which do not prevent foundational pricing engine work.