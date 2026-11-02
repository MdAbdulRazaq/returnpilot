# ReturnPilot Billing Decisions Log

## Decision Log

| Decision | Current Recommendation | Repository Evidence | Business Rationale | Alternatives Considered | Risks | Engineering Impact | Product Owner Decision |
|----------|------------------------|---------------------|--------------------|-------------------------|-------|-------------------|------------------------|
| **Billing Model** | Hybrid Tiered Subscription with Usage Components (predictable base + usage component) | Section 4: Recommends hybrid model combining predictable revenue base with usage-based component | Balances merchant fairness with business sustainability; aligns with core value proposition; leverages Shopify's trusted billing infrastructure | Pure subscription tiers; Pure usage-based; Hybrid with simpler usage metric (e.g., flat fee + per-alert) | Medium-High: Complexity may confuse merchants and increase support burden | Low: Standard implementation using Shopify Billing API; minimal custom logic required | APPROVED with requirement to develop and test merchant-facing explanation materials pre-launch |
| **Usage Metric** | Protected Orders (orders containing at least one refund line item in lookback window) | Section 7: Defines Protected Orders as primary billing metric | Directly correlates with protection value; aligns with detection workload; merchant-understandable business metric; difficult to manipulate; scales naturally with business | Protected refunds; Monitored stores; Revenue protected; API usage | Medium: Novel metric may not align with merchant intuition or perceived fairness; requires education | Medium: Requires accurate counting and tracking system; needs integration with sync pipeline | NEEDS DISCUSSION (pending validation of merchant comprehension through beta testing) |
| **Pricing Tiers & Limits** | Free ($0, 50 orders); Starter ($9, 200); Growth ($29, 1,000); Pro ($79, 5,000); Enterprise (custom) | Section 5: Specific pricing table with monthly prices and protected order limits | Creates clear value progression; scales with merchant size; demonstrates ROI (avg. $500-$5k+ prevented monthly); competitive positioning vs manual recon and generic tools | Cost-plus pricing; Value-based pricing tiers; Competitive benchmarking; Usage-only with minimums | High: Specific numbers lack visible validation; risk of over/under-pricing affecting adoption and revenue | LOW: Simple configuration values; no engineering complexity | MODIFY - require presentation of pricing validation data before final approval |
| **Feature Tiering** | Progressive feature allocation across tiers (basic → advanced → API access) | Section 6: Detailed feature matrix showing progression across tiers | Encourages upgrades through valuable features; aligns feature complexity with merchant needs; creates clear value differentiation | Feature bundles; Add-on marketplace; All-features-in-higher-tiers; Usage-based feature access | Medium: May create perception of artificial limitations; could restrict expansion if not justified | LOW: Feature flags/gates implementation; standard practice | APPROVE but require justification for each feature placement decision |
| **Trial Duration** | 14-day free trial with full feature access | Section 3: Trial section describes 14-day period with full Pro tier access | Sufficient time for merchants to realize value; reduces friction vs payment-upfront; allows full feature evaluation; industry standard for SaaS | 7-day trial; 30-day trial; Tiered trial limits; No trial (freemium model) | Medium: May be insufficient for some merchants to realize value; may attract low-quality leads | LOW: Simple timer implementation; minimal engineering impact | APPROVE but require A/B test plan for trial length optimization |
| **Shopify Billing Integration** | Leverage Shopify's native billing infrastructure via API | Section 9: Details Shopify API usage for billing verification and integration | Leverages Shopify's PCI DSS compliance; reduces payment fraud liability; provides trusted merchant experience; simplifies reconciliation | Custom payment processor; Hybrid approach; Invoice-based billing | Low-Medium: Dependence on Shopify introduces platform risk but leverages their reliability and security | MEDIUM: Requires proper API integration, webhook handling, and version management | APPROVE but require API versioning and deprecation monitoring plan |
| **Data Model Extensibility** | Extend shops table with billing fields; BillingEvent and UsageSnapshot tables | Section 10: Detailed data model specification for billing | Supports initial billing needs with clear schema; uses established patterns (events, snapshots); maintains data integrity; enables reporting and auditing | EAV model; Separate billing microservice; Schema versioning strategy | Low-Medium: Current design supports initial needs but future changes may require migrations | MEDIUM: Requires schema migrations for future enhancements; needs backward compatibility planning | APPROVE but require documented evolution path for future billing needs |
| **Profitability Timeline** | Achieve profitability within 12 months of billing launch | Section 1: Business goals states profitability within 12 months | Creates financial discipline; aligns with investor expectations; encourages efficient execution; focuses on value delivery | 18-month timeline; 24-month timeline; Profitability secondary to growth metrics | High: May necessitate shortcuts that harm long-term viability; could compromise quality or merchant experience | LOW: Timeline doesn't directly impact engineering; affects scope prioritization | MODIFY - adjust to 18-month timeline with quarterly checkpoints |

## Summary

### Approved Decisions
- Billing Model: Hybrid Tiered Subscription with Usage Components
- Feature Tiering: Progressive feature allocation across tiers
- Trial Duration: 14-day free trial with full feature access
- Shopify Billing Integration: Leverage Shopify's native billing infrastructure via API
- Data Model Extensibility: Extend shops table with billing fields; BillingEvent and UsageSnapshot tables

### Deferred Decisions
- None identified at this time

### Rejected Decisions
- Pure Subscription Tiers (considered but rejected in favor of hybrid model)
- Pure Usage-Based Model (considered but rejected in favor of hybrid model)

### Outstanding Blockers
1. **Usage Metric** - Requires validation of merchant comprehension through beta testing before final approval
2. **Pricing Tiers & Limits** - Requires presentation of pricing validation data (market research, customer interviews, pricing experiments) before final approval
3. **Profitability Timeline** - Requires adjustment from 12-month to 18-month target with quarterly checkpoints before final approval

Note: Engineering may prepare implementation contracts and begin foundational work (data model, API integration) but should not implement consumer-facing billing features (Package 2) until all outstanding blockers are resolved and approved by the Product Owner.