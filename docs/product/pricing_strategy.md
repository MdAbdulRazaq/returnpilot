# Pricing Strategy for ReturnPilot

## Executive Summary

ReturnPilot's pricing strategy employs a hybrid tiered subscription model with usage-based components to align merchant costs with the protection value received. The strategy balances predictable revenue streams with fairness, ensuring merchants pay proportional to their store's refund risk while providing clear upgrade paths as their businesses grow. This approach supports our business goals of achieving profitability within 18 months of billing launch and maintaining >90% merchant retention through demonstrable ROI.

## Business Goals

### Revenue Objectives
- Achieve $15,000 Monthly Recurring Revenue (MRR) within 6 months of billing launch
- Reach profitability within 18 months of billing launch (adjusted from original 12-month target)
- Maintain Net Revenue Retention (NRR) > 110% through effective expansion and retention strategies
- Keep Customer Acquisition Cost (CAC) payback period under 6 months

### Merchant Value Proposition
Merchants pay ReturnPilot to protect their bottom line by preventing refund fraud and accidental over-refunds, automating detection that would otherwise require manual reconciliation, providing peace of mind through proactive alerts, and saving operational time and reducing accounting complexities. The average merchant prevents $500-$5,000+ in monthly refund losses, creating strong ROI justification.

### Pricing Philosophy
- **Value-Aligned Pricing**: Merchants pay more as they protect more revenue
- **Predictability**: Fixed monthly fees eliminate billing surprises
- **Fairness**: Scales naturally with business size and risk exposure
- **Transparency**: Clear communication of what's included at each tier
- **Growth Enablement**: Plans scale seamlessly with business expansion

### Growth Strategy
- Leverage the 14-day free trial to demonstrate immediate value
- Implement value-based upgrade prompts at key usage thresholds (80%, 95%)
- Develop targeted marketing campaigns for each merchant segment
- Build referral and partner programs to reduce acquisition costs
- Continuously iterate on pricing based on merchant feedback and usage data

## Plan Definitions

| Plan | Target Customer | Monthly Price | Annual Price (if applicable) | Intended Merchant Profile |
|------|----------------|---------------|------------------------------|---------------------------|
| Free | Testing, very low volume stores | $0 | N/A | Stores processing <50 refund-containing orders/month; merchants evaluating ReturnPilot's value |
| Starter | Small businesses, startups | $9/month | $90/year (17% savings) | Stores processing 50-200 refund-containing orders/month; early-stage businesses seeking essential protection |
| Growth | Growing businesses | $29/month | $290/year (17% savings) | Stores processing 200-1,000 refund-containing orders/month; established businesses expanding operations |
| Pro | Established brands | $79/month | $790/year (17% savings) | Stores processing 1,000-5,000 refund-containing orders/month; mature businesses requiring advanced features |
| Enterprise | High-volume, complex operations | Custom | Custom | Stores processing >5,000 refund-containing orders/month; businesses requiring SLAs, custom integrations, and dedicated support |

## Usage Limits

| Plan | Protected Orders Included | Reset Frequency | Overage Policy | Fair Usage Policy | Upgrade Trigger |
|------|---------------------------|-----------------|----------------|-------------------|-----------------|
| Free | Up to 50 | Monthly calendar | Hard limit at 50 (no grace period) | N/A | Automatic prompt at 40 orders (80% of limit) |
| Starter | Up to 200 | Monthly calendar | 10% grace period (220 orders) before enforcement | Standard usage patterns | Automatic prompt at 160 orders (80% of limit) |
| Growth | Up to 1,000 | Monthly calendar | 10% grace period (1,100 orders) before enforcement | Standard usage patterns | Automatic prompt at 800 orders (80% of limit) |
| Pro | Up to 5,000 | Monthly calendar | 10% grace period (5,500 orders) before enforcement | Standard usage patterns | Automatic prompt at 4,000 orders (80% of limit) |
| Enterprise | Custom (5,000+) | Monthly calendar | Custom grace period (typically 10-20%) | Negotiated based on contract | Custom trigger based on agreement |

*Note: Usage counter resets at midnight UTC on the first day of each calendar month.*

## Feature Matrix

| Feature | Free | Starter | Growth | Pro | Enterprise |
|---------|------|---------|--------|-----|------------|
| **Core Detection** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Dashboard Alerts** | Weekly digest | Daily digest | Daily digest + real-time | Real-time + priority | Real-time + dedicated |
| **Email Notifications** | Weekly | Daily | Daily + urgent | Daily + urgent + summary | Custom frequency |
| **Alert History** | 30 days | 60 days | 90 days | 180 days | Unlimited |
| **Basic Filtering** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Advanced Filtering** | × | × | ✓ | ✓ | ✓ |
| **CSV Export** | × | × | Monthly | Weekly | Daily + custom |
| **API Access** | × | × | × | ✓ | ✓ + higher limits |
| **Custom Alert Thresholds** | × | × | Basic | Full | Full + predictive |
| **Priority Support** | × | Email (24h) | Email (12h) | Email (4h) + chat | Dedicated agent + SLA |
| **Onboarding Assistance** | × | Self-serve | Self-serve | Guided | Custom + training |
| **Multi-user Access** | × | 1 user | 3 users | 10 users | Unlimited + roles |
| **White-label Options** | × | × | × | × | Available |
| **SLA Guarantee** | × | × | × | × | 99.9% uptime |
| **Data Export** | × | × | × | On request | Automated + API |
| **Contract Terms** | N/A | Monthly | Monthly | Monthly | Annual discounts |

## Upgrade & Downgrade Policy

### Upgrade Behavior
- Immediate effect upon confirmation
- Prorated charge calculation: (new_price - old_price) × (days_remaining / total_days)
- Usage limits increase immediately to new plan's allowance
- Access to higher tier features granted immediately
- Confirmation email shows exact proration amount and new billing date

### Downgrade Behavior
- Effective at next billing date
- Prorated credit calculation: (old_price - new_price) × (days_remaining / total_days) applied to next bill
- Feature access ends at period end
- Usage limits decrease at next period start
- Clear warnings 7 days, 3 days, and 1 day before downgrade takes effect
- No prorated refunds for downgrades within billing period

### Trial Conversion
- 14-day free trial with full Pro tier features (5,000 protected orders limit)
- Day 3 and day 7 trial reminder emails highlighting value received
- Day 13 expiration warning with upgrade prompts
- Upon trial expiration without payment: auto-transition to Free tier after 7-day grace period
- Trial → paid conversion target: >40%

### Cancellation
- Available anytime with immediate effect
- Access continues until end of paid period
- Data export available for 30 days post-cancellation
- Offboarding survey presented at cancellation
- Win-back campaign after 30, 60, 90 days
- Re-subscription treated as new merchant (full 14-day trial offered)

### Re-subscription
- Former subscribers treated as new merchants upon reinstall
- Previous settings and preferences optionally restored based on opt-in during uninstall
- New 14-day trial offered to re-evaluate value
- Seamless transition back to paid subscription if satisfied with trial experience

## Billing Rules

### Billing Cycle
- Monthly calendar billing (1st of each month)
- Usage calculated based on UTC billing period to avoid DST issues
- Prorated charges/credits calculated based on actual days in billing period

### Trial Rules
- 14-day free trial begins immediately upon installation
- No payment method required upfront
- Full access to Pro tier features during trial
- Clear trial expiration messaging in dashboard and emails
- Day 3 and day 7 trial reminder emails
- Day 13 expiration warning
- Day 14 trial expiration with limited access notice

### Renewal Behavior
- Automatic renewal unless canceled before next billing date
- Renewal attempt 3 days before expiration date
- Failed renewal follows failed payment handling procedure
- Successful renewal confirmation email with next billing date

### Failed Payment Handling
- First failure: Retry in 3 days, email notification
- Second failure: Retry in 7 days, urgent email + in-app banner
- Third failure: Subscription canceled, access suspended
- Grace periods:
  * 0-3 days: Full protection, payment retry pending
  * 3-7 days: Full protection, urgent action needed
  * 7+ days: Service suspended, data preserved for 30 days
- Recovery path:
  * Update payment method → immediate retry
  * Success → service restoration + notification
  * Failure → continue to next retry attempt
- Fraud guard: Same card failed 3x in 7 days → temporary block

### Cancellation Timing
- Available anytime with immediate effect
- Access continues until end of paid period (no mid-period termination)
- Cancellation takes effect at end of current billing period
- Confirmation of access end date provided at cancellation

### Refund Policy
- No prorated refunds for cancellations within billing period
- Service continues until end of paid period after cancellation
- Data export available for 30 days post-cancellation
- Refunds only issued for billing errors (duplicate charges, etc.) via Shopify Billing API

## Merchant Experience

### Billing Page Expectations
- Clear display of current plan, next billing date, and amount
- Usage metrics showing current period protected orders vs. plan limits
- Upgrade/downgrade options with proration calculations visible
- Payment method management (view only - updates handled via Shopify)
- Invoice history with downloadable receipts
- Option to change billing frequency (monthly to annual) with applicable discounts

### Upgrade Flow
- Available from settings dashboard or contextual prompts
- Side-by-side comparison of current vs. target plan features/limits
- Real-time proration calculation shown before confirmation
- Immediate access to higher tier features upon upgrade
- Usage counters reset appropriately for new plan limits
- Confirmation email with updated subscription details

### Warning Messages
- Trial ending: Banner 3 days before trial end with upgrade CTA
- Usage limit approaching: Banner at 80% and 95% of plan limit
- Payment issue: Immediate banner on failed payment with retry CTA
- Webhook issues: Alert if Shopify webhook verification repeatedly fails
- Sync problems: Warning if no successful sync in >25 hours

### Limit Reached Experience
- At 80% and 95% of limit: Email and in-app banner notifications
- Beyond 100% limit (with grace period): New protection processing blocked
- Existing alerts remain accessible and actionable
- Dashboard continues to display historical data and non-protection features
- Clear messaging about upgrade requirements with direct link to upgrade flow

### Grace Period Behavior
- 10% grace period before hard enforcement (except Free tier)
- Notifications at 80% and 95% of limit (email and in-app)
- New alert generation blocked after exceeding grace period limit
- Historical data and existing alerts remain fully accessible
- Service restoration immediate upon plan upgrade

## Edge Cases

### Trial Expiration
- Day 13: Warning email with upgrade prompts
- Day 14: Trial expires, limited access notice in dashboard
- Days 15-21: Grace period with Free tier features (limited functionality)
- Day 22: Auto-transition to Free tier if no upgrade
- Merchants can upgrade anytime during grace period to restore full functionality

### Plan Changes
- Upgrades: Immediate effect, prorated charge, immediate limit increase
- Downgrades: Effective next billing period, prorated credit, limit decrease at period start
- Same tier changes (monthly to annual): Handled as renewal with new commitment
- All plan changes: Usage counter continues accumulation through change
- Plan limits change immediately for upgrades, at period start for downgrades

### Reinstallation
- Within 30 days, same plan: Restore previous settings if opted-in during uninstall
- Within 30 days, different plan: Start new trial, offer to restore settings
- >30 days since cancellation: Treat as new merchant (full 14-day trial)
- Valid token: Skip OAuth, go directly to dashboard with notice
- Expired token: Full OAuth flow required
- Shop renamed during absence: Detect via Shopify permanent shop ID, prompt confirmation

### Shopify Subscription Cancellation
- Detected via Shopify webhook subscription cancellation
- Immediate synchronization with local state
- Access continues until end of paid period
- Clear messaging about cancellation and data export availability
- Win-back campaign initiated after 30 days

### Billing Sync Failures
- Failed webhook deliveries: Queue for retry with exponential backoff
- Failed API calls: Queue for retry with circuit breaker protection
- Missing sync data >5 days: Automatic resume when API calls succeed
- Backfill protected orders for downtime period (historical estimate)
- No double-charging for paused periods
- Clear in-app banner and email notification for prolonged sync issues

## Product Owner Decisions

| Decision ID | Decision Description | Related Section |
|-------------|----------------------|-----------------|
| PRICE-001 | Adopt hybrid tiered subscription with usage components (predictable base + usage component) | Executive Summary, Pricing Philosophy |
| PRICE-002 | Use Protected Orders (orders containing at least one refund line item in 60-day lookback window) as primary billing metric | Usage Limits, Business Goals |
| PRICE-003 | Set pricing tiers: Free ($0, 50 orders), Starter ($9, 200), Growth ($29, 1,000), Pro ($79, 5,000), Enterprise (custom) | Plan Definitions, Usage Limits |
| PRICE-004 | Allocate features progressively across tiers per the feature matrix in Section 6 of billing.md | Feature Matrix |
| PRICE-005 | Set trial duration to 14 days with full Pro tier access | Billing Rules (Trial Rules) |
| PRICE-006 | Implement 10% grace period before hard enforcement for paid tiers (Free tier has no grace period) | Usage Limits (Overage Policy) |
| PRICE-007 | Send notifications at 80% and 95% of usage limit (email and in-app banner) | Merchant Experience (Warning Messages) |
| PRICE-008 | Block new protection processing after exceeding grace period limit; maintain access to existing alerts | Merchant Experience (Limit Reached Experience) |
| PRICE-009 | Reset usage counters at midnight UTC on first day of each calendar month | Usage Limits (Reset Frequency) |
| PRICE-010 | Set upgrade behavior to immediate effect with prorated charges | Upgrade & Downgrade Policy (Upgrade Behavior) |
| PRICE-011 | Set downgrade behavior to effective at next billing date with prorated credits | Upgrade & Downgrade Policy (Downgrade Behavior) |
| PRICE-012 | Define failed payment handling: 3-day and 7-day retry attempts, suspension after 3 failures | Billing Rules (Failed Payment Handling) |
| PRICE-013 | Set cancellation timing to immediate effect with access through end of paid period | Upgrade & Downgrade Policy (Cancellation) |
| PRICE-014 | Establish refunds only for billing period | Billing Rules (Refund Policy) |
| PRICE-014 | Define refund policy: no prorated refunds within billing period, service continues only for billing errors paid period, data export available for  days post-cancellation | Billing Rules (Refund Policy) |
| PRICE-015 | Set annual pricing discount to 17% (2 months free) for annual commitments | Plan Definitions (Annual Price column) |
| PRICE-016 | Set multi-user access limits: Free (0), Starter (1), Growth (3), Pro (10), Enterprise (unlimited + roles) | Feature Matrix (Multi-user Access) |
| PRICE-017 | Set alert history limits: Free (30 days), Starter (60 days), Growth (90 days), Pro (180 days), Enterprise (unlimited) | Feature Matrix (Alert History) |
| PRICE-018 | Set CSV export frequency: Free (none), Starter (none), Growth (monthly), Pro (weekly), Enterprise (daily + custom) | Feature Matrix (CSV Export) |
| PRICE-019 | Set advanced filtering availability: Free (no), Starter (no), Growth (yes), Pro (yes), Enterprise (yes) | Feature Matrix (Advanced Filtering) |
| PRICE-020 | Set API access availability: Free (no), Starter (no), Growth (no), Pro (yes), Enterprise (yes + higher limits) | Feature Matrix (API Access) |
| PRICE-021 | Set custom alert thresholds availability: Free (no), Starter (no), Growth (basic), Pro (full), Enterprise (full + predictive) | Feature Matrix (Custom Alert Thresholds) |
| PRICE-022 | Set priority support levels: Free (none), Starter (email 24h), Growth (email 12h), Pro (email 4h + chat), Enterprise (dedicated agent + SLA) | Feature Matrix (Priority Support) |
| PRICE-023 | Set onboarding assistance levels: Free (none), Starter (self-serve), Growth (self-serve), Pro (guided), Enterprise (custom + training) | Feature Matrix (Onboarding Assistance) |
| PRICE-024 | Set multi-user access levels: Free (none), Starter (1 user), Growth (3 users), Pro (10 users), Enterprise (unlimited + roles) | Feature Matrix (Multi-user Access) |
| PRICE-025 | Set white-label options availability: Free (no), Starter (no), Growth (no), Pro (no), Enterprise (yes) | Feature Matrix (White-label Options) |
| PRICE-026 | Set SLA guarantee availability: Free (no), Starter (no), Growth (no), Pro (no), Enterprise (yes, 99.9% uptime) | Feature Matrix (SLA Guarantee) |
| PRICE-027 | Set data export availability: Free (none), Starter (none), Growth (none), Pro (on request), Enterprise (automated + API) | Feature Matrix (Data Export) |
| PRICE-028 | Set contract terms: Free (N/A), Starter (monthly), Growth (monthly), Pro (monthly), Enterprise (annual discounts available) | Feature Matrix (Contract Terms) |

## Engineering Readiness

### Decisions Complete
- All Product Owner decisions listed above (PRICE-001 through PRICE-028) are complete
- These decisions provide sufficient specification for Package 4 engineering implementation

### Decisions Still Pending
- None - all necessary business decisions for Package 4 have been made

### Risks
- **Pricing Validation Risk**: While pricing tiers are set based on competitive analysis and value proposition, final validation through merchant testing is recommended post-launch (Mitigation: A/B testing and merchant feedback loops)
- **Usage Metric Comprehension**: Some merchants may require education to understand and trust the Protected Orders metric (Mitigation: Clear in-product explanations, educational materials, and transparent reporting)
- **Feature Tiering Aggressiveness**: Certain feature placements (like API access only in Pro tier) may limit expansion for some segments (Mitigation: Monitor adoption and adjust feature allocations based on merchant feedback)
- **Enterprise Custom Negotiations**: Custom enterprise contracts may require additional sales and legal resources (Mitigation: Standardized enterprise packaging with clear upgrade paths)

### Open Questions
- None - all critical business decisions for Package 4 specification are resolved

### Final Readiness Status
READY FOR PACKAGE 4 ENGINEERING

---
*This document constitutes the complete Product Owner specification for Package 4: Pricing & Plans. All business decisions are documented with unique IDs for traceability to future engineering implementations.*