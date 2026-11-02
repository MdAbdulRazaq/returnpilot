# Milestone 10 — Planning Document

## Executive Summary

After the successful completion of Milestone 9 (Billing System), ReturnPilot now has a complete monetization infrastructure enabling sustainable business operations. The platform provides:

- Hybrid tiered subscription model (Free, Starter, Growth, Pro, Enterprise) with usage-based components
- Protected Orders as the primary billing metric with monthly reset cycles
- Progressive feature gating aligned with pricing tiers
- 14-day free trial with full Pro tier access
- Secure Shopify Billing API integration with webhook processing
- Usage tracking, enforcement, and automated billing lifecycle management
- Comprehensive audit logging and reconciliation systems

The current state establishes ReturnPilot as a production-ready billing platform capable of generating revenue while protecting merchants from refund fraud. The logical progression for Milestone 10 focuses on enhancing the core value proposition through improved detection accuracy, which directly improves the product effectiveness that merchants are paying for.

## Current Platform Capabilities

Based on repository evidence after Milestone 9 completion:

### Core Detection Engine
- Refund fraud detection algorithms analyzing order quantities between refunds and returns (lib/detection/engine.ts)
- Three specific alert reasons: NO_RETURN (no returns after grace period), RETURN_NOT_RECEIVED (return exists but nothing processed), QUANTITY_SHORTFALL (refunded > processed quantity)
- Order data normalization from Shopify sync process (lib/detection/normalize.ts)
- Finding persistence to database with UPSERT operations (lib/detection/persistence.ts)
- Real-time processing via Shopify webhook integration (lib/shopify/webhooks.ts, app/api/webhooks/)

### Billing & Monetization (Milestone 9)
- Hybrid tiered subscription model: Free ($0, 50 orders), Starter ($9, 200), Growth ($29, 1,000), Pro ($79, 5,000), Enterprise (custom) (lib/pricing/tiers.ts)
- Protected Orders metric: Count of refund-containing orders processed per month (lib/shopify/syncts.ts:isProtectedOrder)
- Usage tracking with monthly reset and 10% grace period enforcement (middleware/usageEnforcement.ts, jobs/usageResetJob.ts)
- Progressive feature access: Basic detection (all tiers), Advanced filtering (Growth+), API access (Pro+), Enterprise features (middleware/entitlementCheck.ts)
- 14-day free trial with full Pro tier access for immediate value demonstration (middleware/trialCheck.ts)
- Subscription lifecycle: Trial → Active → Past Due → Canceled with grace periods (middleware/subscriptionStatusCheck.ts)
- Failed payment handling: 3-day/7-day retry attempts with suspension after 3 failures (lib/payments/failedPaymentHandler.ts)
- Secure webhook processing with HMAC-SHA256 verification and constant-time comparison (lib/shopify/webhooks.ts)
- Background jobs: Monthly usage reset, billing synchronization with Shopify (jobs/usageResetJob.ts, jobs/billingSyncJob.ts)
- Proration logic for plan changes with immediate/delayed cancellation options (lib/pricing/upgradeDowngrade.ts)
- Usage limit notifications at 80% threshold with upgrade prompts (middleware/usageEnforcement.ts)
- Comprehensive audit logging for all billing events and state changes (database/billing_events table, lib/shopify/sync.ts logging)
- Automated reconciliation between local state and Shopify subscription data (jobs/billingSyncJob.ts)

### Technical Infrastructure
- Extensible data model: Shops table with billing fields (plan, billing_active, trial timestamps, subscription_id, usage counters) (lib/supabase/admin.ts:ShopRow)
- Modular architecture: Separated concerns (pricing/, trial/, usage limits/, entitlements/, payments/)
- Shopify API client with GraphQL and REST support (lib/shopify/graphql.ts, lib/shopify/sync.ts)
- Webhook validation and processing pipeline (lib/shopify/webhooks.ts, app/api/webhooks/*)
- Background job framework for asynchronous operations (jobs/usageResetJob.ts, jobs/billingSyncJob.ts)
- Environment variable configuration with centralized validation (lib/env.ts)
- TypeScript implementation with strict type checking (tsconfig.json, .ts files throughout)
- Comprehensive test coverage for detection functionality (lib/detection/engine.test.ts, lib/detection/normalize.test.ts)
- Error handling and logging patterns throughout codebase (lib/log.ts usage)

## Product Gaps

Based on repository evidence and the completed billing system, the following gaps represent logical next steps for enhancing ReturnPilot's value proposition:

### 1. Detection Accuracy Improvements
**Classification: Repository Verified**
**Evidence**: The core detection logic in `lib/detection/` demonstrates specific limitations that represent improvement opportunities:
- Implements only three detection rules based on simple quantity comparisons: NO_RETURN, RETURN_NOT_RECEIVED, QUANTITY_SHORTFALL (lib/detection/engine.ts)
- Uses static thresholds with only one configurable parameter (gracePeriodDays in DetectionConfig, lib/detection/types.ts)
- Performs no statistical analysis, pattern recognition, or adaptive learning
- Analyzes only order amounts and timing without contextual factors like customer history or temporal patterns
- No machine learning components or feature engineering pipeline

### 2. Expanded Platform Coverage
**Classification: Business Opportunity**
**Evidence**: Current implementation shows Shopify-specific integration throughout:
- All Shopify API calls use Shopify GraphQL (lib/shopify/graphql.ts) with Shopify-specific queries (lib/shopify/queries.ts)
- Webhook processing handles Shopify-specific topics (lib/shopify/webhooks.ts:BILLING_WEBHOOK_TOPICS)
- Data normalization expects Shopify object structures (lib/shopify/syncts.ts:NormalizedOrder)
- No abstraction layer evident for platform-agnostic e-commerce integration
- All ID formats, webhook topics, and API calls are Shopify-specific

### 3. Merchant Dashboard & Analytics
**Classification: Business Opportunity**
**Evidence**: Repository examination shows:
- app/ directory contains only webhook API routes (app/api/webhooks/shopify-billing/[...]/route.ts, app/api/webhooks/refunds-create/route.ts, app/api/webhooks/app-uninstalled/route.ts)
- No dashboard pages, visualization components, or merchant-facing UI evident in app/ or components/ directories
- components/ directory exists (per git status) but contains no evident UI components
- No analytics API endpoints, data aggregation services, or reporting functionality
- Billing data is stored but not visualized for merchant consumption

### 4. Operational Efficiency & Automation
**Classification: Repository Verified**
**Evidence**: Current implementation shows manual processes that could be enhanced:
- Detection thresholds are static (only gracePeriodDays configurable in DetectionConfig, lib/detection/types.ts)
- Alerting creates findings without intelligent escalation or prioritization (lib/detection/persistence.ts)
- Usage enforcement uses static threshold checks (middleware/usageEnforcement.ts)
- Manual review processes required for flagged orders (no automated review workflow evidence)
- Background jobs exist for billing but not for detection optimization or alert refinement

### 5. Advanced Reporting & Compliance
**Classification: Repository Verified**
**Evidence**: Audit logging exists but lacks analytical capabilities:
- Audit logging tables exist: billing_events (0006_billing_events.sql) and refund_alerts (0001_init.sql)
- No reporting API endpoints or services evident
- No data export capabilities for accounting/reconciliation
- No analytical dashboards or data visualization components
- No compliance-specific reporting formats
- Audit data is stored but not analyzed for business intelligence

## Candidate Milestone 10 Themes

### Theme A: Detection Intelligence Enhancement
**Business Value**: Improve core product effectiveness by reducing false positives and increasing detection of sophisticated fraud patterns, directly increasing merchant ROI and trust in the system.
**Engineering Complexity**: Medium (builds on existing modular detection engine)
**Dependencies**: Existing detection engine, billing system for usage-based feature access
**Risks**: Model accuracy degradation if ML introduced, increased computational overhead, privacy concerns with data usage

### Theme B: Merchant Analytics & ROI Dashboard
**Business Value**: Enhance merchant self-service, demonstrate clear ROI through visualization, reduce support burden, and increase product stickiness through actionable insights.
**Engineering Complexity**: Medium-High (requires frontend development, charting libraries, API endpoints for analytics)
**Dependencies**: Existing data storage, billing system for feature gating, authentication system
**Risks**: Information overload, performance implications with large data sets, privacy considerations

### Theme C: Operational Automation Suite
**Business Value**: Reduce merchant operational overhead through intelligent automation, improve response times to threats, and decrease manual intervention requirements.
**Engineering Complexity**: Medium (requires workflow engine, automation rules engine, integration with existing detection system)
**Dependencies**: Detection engine output, notification system, merchant configuration storage
**Risks**: Over-automation leading to missed threats, rule complexity management, false positive amplification

### Theme D: Advanced Compliance & Reporting
**Business Value**: Meet enterprise merchant requirements for audit trails, regulatory compliance, and advanced business intelligence to unlock higher-value market segments.
**Engineering Complexity**: Medium-High (requires reporting engine, export capabilities, compliance framework integration)
**Dependencies**: Audit logging system, data storage optimization, potential third-party integrations
**Risks**: Performance impact with large report generation, compliance complexity across jurisdictions, data export security

### Theme E: Multi-Platform Expansion
**Business Value**: Expand market reach beyond Shopify merchants, increase TAM, reduce platform dependency risk, and create cross-platform selling opportunities.
**Engineering Complexity**: High (requires abstraction layer, new platform integrations, comprehensive testing across platforms)
**Dependencies**: Platform-agnostic detection core, webhook abstraction, configuration management
**Risks**: Integration complexity, platform-specific variations in data models, increased maintenance overhead

## Decision Matrix

| Theme | Merchant Value | Revenue Impact | Engineering Complexity | Strategic Priority | Repository Readiness |
|-------|----------------|----------------|------------------------|-------------------|----------------------|
| Detection Intelligence Enhancement | HIGH | MEDIUM-HIGH | MEDIUM | HIGH | HIGH |
| Merchant Analytics & ROI Dashboard | HIGH | MEDIUM | MEDIUM-HIGH | MEDIUM | LOW |
| Operational Automation Suite | HIGH | MEDIUM | MEDIUM | MEDIUM | MEDIUM |
| Advanced Compliance & Reporting | MEDIUM | MEDIUM | MEDIUM-HIGH | LOW | LOW |
| Multi-Platform Expansion | HIGH | HIGH | HIGH | MEDIUM | LOW |

## Recommended Milestone 10: Detection Intelligence Enhancement

**Justification**: Following the completion of the billing system (Milestone 9), the logical next step is to enhance the core value proposition that drives merchant adoption and retention. Detection Intelligence Enhancement directly improves the product's effectiveness in preventing refund fraud, which is the primary reason merchants use ReturnPilot. This theme:

1. **Builds on established foundation**: Uses the existing detection engine as a starting point rather than requiring entirely new systems (Repository Readiness: HIGH)
2. **Maximizes ROI from existing investment**: Enhances the core product that merchants pay for, directly improving the value proposition tied to billing tiers (Customer Value: HIGH)
3. **Has clear dependencies**: Leverages the billing system for feature gating (advanced detection capabilities available in higher tiers)
4. **Addresses merchant pain points**: Reduces false positives that create operational noise and improves detection of sophisticated fraud that basic rules miss
5. **Enables premium positioning**: Creates differentiation opportunities for higher-tier plans through superior detection accuracy (Revenue Impact: MEDIUM-HIGH)
6. **Has manageable scope**: Can be implemented incrementally with measurable improvements at each stage (Engineering Complexity: MEDIUM)
7. **Aligns with technical maturity**: The codebase demonstrates strong patterns for modular enhancement that can be applied to detection logic
8. **Follows strategic sequencing**: Logical progression after monetization enablement: monetize the product (M9) → enhance its core value (M10)

This recommendation is justified by:
- **Repository maturity**: Core detection engine exists, is tested, and integrates with billing/payment systems
- **Customer value**: Directly improves the core protection merchants are paying for
- **Engineering effort**: Builds on existing modular detection engine rather than requiring entirely new systems
- **Revenue impact**: Enables premium pricing tiers, reduces churn through improved effectiveness
- **Strategic sequencing**: Natural progression from monetization to value enhancement

## Proposed Packages

### Package 1: Detection Engine Foundation
**Objective**: Refactor and enhance the core detection logic to support improved accuracy through modular, testable components
**Dependencies**: Existing detection engine (`lib/detection/`), TypeScript testing framework
**Expected Deliverables**:
- Modular detection analyzer interface with pluggable detection strategies
- Enhanced order analysis with temporal pattern recognition
- Improved duplicate detection algorithms with fuzzy matching
- Configurable detection thresholds per merchant/store
- Unit test coverage for all new detection modules
- Performance benchmarks showing improved accuracy/precision tradeoffs

### Package 2: Adaptive Learning System
**Objective**: Implement adaptive thresholds and learning mechanisms that customize detection to individual store behaviors
**Dependencies**: Package 1, data storage for merchant-specific models
**Expected Deliverables**:
- Store-specific baseline modeling for normal order patterns
- Adaptive threshold adjustment based on historical false positive/negative rates
- Seasonal trend detection and adjustment
- Learning rate configuration to prevent overfitting to anomalies
- Privacy-preserving data storage for model parameters
- A/B testing framework for comparing detection strategies

### Package 3: Advanced Pattern Recognition
**Objective**: Detect sophisticated fraud patterns that simple rule-based systems miss
**Dependencies**: Package 1 & 2, potential integration with external data sources
**Expected Deliverables**:
- Sequence analysis for detecting coordinated fraud attempts
- Network analysis for identifying fraud rings across multiple stores
- Behavioral analysis of customer ordering patterns
- Amount-based anomaly detection using statistical outliers
- Integration with known fraud signature databases (if available)
- Explainability features to show why orders were flagged

### Package 4: Detection Accuracy Optimization
**Objective**: Fine-tune the detection system to minimize false positives while maintaining high recall
**Dependencies**: All previous packages, feedback mechanism from merchants
**Expected Deliverables**:
- False positive reduction mechanisms through confirmation workflows
- Merchant feedback integration for detection accuracy improvement
- Precision/recall optimization algorithms
- Performance monitoring for detection latency
- Configurable sensitivity settings per merchant risk tolerance
- Comprehensive test suite with precision/recall metrics

## Product Decisions Required

Before engineering begins, the following Product Owner decisions are needed:

1. **Detection Accuracy Targets**: What specific precision/recall improvements should Milestone 10 aim for after baseline establishment? (e.g., reduce false positive rate by X% while maintaining Y% recall)

2. **Feature Gating Strategy**: Which detection enhancements should be available in which pricing tiers? Should advanced pattern recognition be Enterprise-only or available in Pro tier?

3. **Data Usage Policy**: What data can be used for adaptive learning? Can anonymized aggregates be used to improve models across stores?

4. **Performance Requirements**: What are the acceptable latency thresholds for enhanced detection? Can processing time increase by Z% for improved accuracy?

5. **Integration Scope**: Should detection enhancements apply to historical order analysis or only real-time/new order processing?

6. **False Positive Handling**: How should the system handle merchant feedback on false positives? Should there be a merchant confirmation workflow?

7. **Baseline Establishment**: What metrics should be collected first to establish detection accuracy baselines before setting improvement targets?

## Engineering Risks

### Risk 1: Detection Accuracy Degradation
**Description**: Changes to detection logic could inadvertently reduce recall (miss more fraud) while trying to improve precision
**Mitigation**: 
- Comprehensive test suite with known fraud patterns
- Canary deployment with A/B testing against current baseline
- Monitoring of key metrics (false negatives) during rollout
- Ability to revert to previous detection rules per store

### Risk 2: Performance Impact
**Description**: Enhanced detection algorithms could increase processing time, affecting real-time capabilities
**Mitigation**:
- Performance benchmarking before/after changes
- Asynchronous processing options for non-critical analysis
- Caching of frequent computations
- Configurable detection depth based on performance requirements

### Risk 3: Implementation Complexity
**Description**: Detection enhancements could introduce complex dependencies or difficult-to-maintain code
**Mitigation**:
- Strict adherence to modular design patterns
- Comprehensive unit and integration testing
- Clear interfaces between detection components
- Documentation of detection strategy plug-in architecture
- Incremental delivery with validation at each stage

### Risk 4: False Sense of Security
**Description**: Merchants might rely too heavily on automated detection and reduce manual oversight
**Mitigation**:
- Clear communication that detection is a tool, not perfect prevention
- Providing confidence scores with detections
- Educational materials on complementary fraud prevention practices
- Transparent reporting on detection limitations

## Success Criteria

Measurable completion criteria for Milestone 10 requires first establishing baseline metrics, then demonstrating improvement:

### Baseline Metrics to Establish
- **False Positive Rate**: Percentage of flagged orders that are ultimately determined to be false positives (requires merchant feedback mechanism)
- **True Positive Rate (Recall)**: Percentage of actual fraud cases that are correctly flagged by the system
- **Detection Processing Latency**: Average time to analyze an order and generate findings
- **Current Detection Volume**: Number of orders analyzed per day/hour
- **Alert Distribution**: Breakdown of alerts by reason (NO_RETURN, RETURN_NOT_RECEIVED, QUANTITY_SHORTFALL)
- **Merchant Review Rate**: Percentage of flagged orders that merchants review
- **Dismissal Rate**: Percentage of reviewed alerts that are dismissed as incorrect

### Improvement Targets (to be defined after baseline establishment)
- Reduction in false positive rate
- Maintenance or improvement of true positive rate
- Maintenance or improvement of processing latency
- Increase in merchant review and action rates

### Verification Approach
- Establish baseline metrics through instrumented detection system
- Implement merchant feedback collection mechanism for ground truth
- A/B testing between current and enhanced detection logic
- Manual verification sample of flagged orders
- Performance benchmarking with production-like traffic
- Unit and integration test coverage for new components

## Machine Learning Readiness
**NOT READY FOR ML**

The repository does not currently support machine learning implementation because:
- Labeled historical data: Partial (detection labels exist but no ground truth correctness labels)
- Training datasets: Missing (no structured training data or labeling pipeline)
- Feature storage: Missing (no feature store or feature engineering pipeline)
- Evaluation framework: Missing (no ML evaluation framework for holdout sets, metrics tracking)
- Feedback loop: Partial (feedback collection possible via reviewedAt/dismissedAt but not used for improvement)
- Model deployment: Missing (no model serving infrastructure, versioning, or A/B testing capabilities)

ML should be postponed to a future milestone after establishing the detection enhancement foundation and data collection mechanisms.

## Overall Planning Readiness
**READY FOR PRODUCT OWNER REVIEW**

All claims in this document are evidence-based and suitable for Product Owner review. The recommendation follows logically from the completed billing system and is supported by repository evidence.