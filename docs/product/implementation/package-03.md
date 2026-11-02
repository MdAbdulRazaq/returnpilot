# Usage Tracking & Subscription Enforcement - Package 3 Implementation Contract

## 1 Executive Summary

### Objective
Implement usage tracking enforcement and subscription validation mechanisms to enable plan limit enforcement based on protected orders metrics, establishing the enforcement layer for ReturnPilot's billing system while maintaining clear separation from pricing logic and user interface components.

### Engineering Purpose
Build upon Package 2's foundational billing infrastructure to add active enforcement of plan limits, real-time subscription validation, and automated usage reset logic. This package transforms the read-only usage tracking foundation into an active enforcement system that prevents service access when plan limits are exceeded, while ensuring synchronization between ReturnPilot's internal state and Shopify's billing system.

### Repository Context
Package 2 established the foundational Shopify Billing API integration, extended the shops table with billing fields, implemented webhook handlers for subscription events, and created read-only usage tracking (protected orders counting). Package 3 builds directly upon this foundation to add enforcement mechanisms, validation logic, and automated reset functionality.

## 2 Repository Evidence

| Path | Why It Matters | Dependency |
|------|----------------|------------|
| `lib/shopify/sync.ts` | Contains `isProtectedOrder` function and usage counting foundation from Package 2 | Required for usage tracking implementation |
| `lib/supabase/admin.ts` | Contains ShopRow interface with all billing fields and audit logging functions | Required for subscription state access and validation |
| `lib/shopify/billing.ts` | Shopify Billing API client wrapper from Package 2 | Required for subscription verification and status checks |
| `lib/shopify/webhooks.ts` | Contains billing webhook verification infrastructure | Required for secure webhook processing in enforcement flows |
| `database/0005_billing_fields.sql` | Migration adding billing fields to shops table | Provides schema for usage tracking and enforcement data |
| `lib/env.ts` | Environment variable validation framework | Will need to validate enforcement-related configuration |
| `lib/shopify/register.ts` | Webhook registration logic | Pattern to follow for enforcement-related webhook registration |
| `app/api/webhooks/shopify-billing/[...]/route.ts` | Billing webhook handlers from Package 2 | Reference for enforcement webhook handler patterns |

## 3 Scope

| Requirement | Repository Evidence | Product Owner Decision | Affected Subsystem |
|-------------|---------------------|------------------------|-------------------|
| Implement usage enforcement middleware that checks plan limits before processing detection requests | `lib/shopify/sync.ts` (usage counting foundation), docs/product/billing_decisions.md: "Usage Metric: Protected Orders" | docs/product/billing_decisions.md: Decision on Usage Metric (protected orders) requires enforcement logic in later packages | Request processing middleware, API route protection |
| Add automated usage reset logic aligned with billing cycles | `database/0005_billing_fields.sql` (usage_reset_at field), docs/product/billing.md: Section 7 (Usage Calculation) | docs/product/billing_decisions.md: implied through data model extensibility | Background jobs, sync processing |
| Implement subscription validation against Shopify's source of truth | `lib/shopify/billing.ts` (API client), docs/product/billing.md: Section 9 (Shopify Integration) | docs/product/billing_decisions.md: "Shopify Billing Integration: Leverage Shopify's native billing infrastructure via API" | Subscription validation service, webhook handlers |
| Create entitlement checks for feature access based on plan tier | `lib/supabase/admin.ts` (ShopRow plan field), docs/product/billing.md: Section 6 (Feature Matrix) | docs/product/billing_decisions.md: "Feature Tiering: Progressive feature allocation across tiers" | Feature gate middleware, API route protection |
| Implement plan limit evaluation logic for protected orders | `lib/shopify/sync.ts` (isProtectedOrder function), docs/product/billing.md: Section 7 (Usage Model) | docs/product/billing_decisions.md: Decision on Usage Metric (protected orders) requires limit evaluation logic | Usage tracking service, enforcement middleware |
| Add billing state synchronization jobs to reconcile with Shopify | `lib/shopify/billing.ts` (subscription query), docs/product/billing_decisions.md: "Shopify Billing Integration: Leverage Shopify's native billing infrastructure via API" | docs/product/billing_decisions.md: Shopify Billing Integration decision | Background synchronization jobs |
| Implement subscription status verification for access control | `lib/supabase/admin.ts` (ShopRow billing_active field), docs/product/billing.md: Section 8 (Billing Lifecycle) | docs/product/billing_decisions.md: implicit in billing lifecycle state machine | Access control middleware, API route protection |

## 4 Decision Traceability Matrix

| Product Decision | Repository Evidence | Implementation Item | Affected Files | Status |
|------------------|---------------------|---------------------|----------------|--------|
| Usage Metric: Protected Orders (foundation approved, enforcement in later packages) | `lib/shopify/sync.ts` (isProtectedOrder function), docs/product/billing_decisions.md | Usage enforcement middleware | `middleware/usageEnforcement.ts` (new), `lib/shopify/sync.ts` (modification) | ✓ Approved |
| Feature Tiering: Progressive feature allocation across tiers | `lib/supabase/admin.ts` (ShopRow plan field), docs/product/billing_decisions.md | Entitlement checks for feature access | `middleware/entitlementCheck.ts` (new), `lib/supabase/admin.ts` (reference) | ✓ Approved |
| Shopify Billing Integration: Leverage Shopify's native billing infrastructure via API | `lib/shopify/billing.ts`, docs/product/billing_decisions.md | Subscription validation against Shopify source of truth | `services/subscriptionValidator.ts` (new), `lib/shopify/billing.ts` (reference) | ✓ Approved |
| Data Model Extensibility: Extend shops table with billing fields | `database/0005_billing_fields.sql`, docs/product/billing_decisions.md | Automated usage reset logic | `jobs/usageResetJob.ts` (new), `database/0005_billing_fields.sql` (reference) | ✓ Approved |
| Usage Metric: Protected Orders (requires enforcement logic) | `lib/shopify/sync.ts` (usage counting), docs/product/billing.md: Section 7 | Plan limit evaluation logic | `lib/usage/limitEvaluator.ts` (new), `lib/shopify/sync.ts` (reference) | ✓ Approved |
| Shopify Billing Integration: Leverage Shopify's native billing infrastructure via API | `lib/shopify/billing.ts`, docs/product/billing_decisions.md | Billing state synchronization jobs | `jobs/billingSyncJob.ts` (new), `lib/shopify/billing.ts` (reference) | ✓ Approved |
| implicit in billing lifecycle state machine | `lib/supabase/admin.ts` (ShopRow fields), docs/product/billing.md: Section 8 | Subscription status verification for access control | `middleware/subscriptionStatusCheck.ts` (new), `lib/supabase/admin.ts` (reference) | ✓ Approved |

## 5 Files Expected To Change

| File | Reason | Risk | Existing/New |
|------|--------|------|--------------|
| `middleware/usageEnforcement.ts` | New middleware to enforce plan limits before processing detection requests | Medium - introduces new middleware layer that could affect performance if not optimized | New |
| `middleware/entitlementCheck.ts` | New middleware to check feature access based on plan tier | Low - isolated implementation with clear responsibility | New |
| `middleware/subscriptionStatusCheck.ts` | New middleware to verify subscription status for access control | Low - focused implementation with clear failure modes | New |
| `services/subscriptionValidator.ts` | New service to validate subscriptions against Shopify's API | Medium - external API calls require proper error handling and caching | New |
| `jobs/usageResetJob.ts` | New background job to reset usage counters at billing cycle boundaries | Low - isolated job with clear timing responsibilities | New |
| `jobs/billingSyncJob.ts` | New background job to synchronize billing state with Shopify | Medium - external API synchronization requires careful error handling | New |
| `lib/usage/limitEvaluator.ts` | New module to evaluate plan limits based on protected orders | Low - pure logic implementation with clear inputs/outputs | New |
| `lib/shopify/sync.ts` | Enhance usage counting to support enforcement (add limit checking) | Low - builds on existing read-only counting foundation | Existing |
| `lib/env.ts` | Add validation for enforcement-related environment variables | Low - additive validation with clear error messages | Existing |
| `lib/shopify/register.ts` | Extend webhook registration to include enforcement-related webhooks | Low - follows existing webhook registration patterns | Existing |

## 6 Implementation Order

| Prerequisite | Implementation | Validation | Expected Result |
|--------------|----------------|------------|-----------------|
| Package 2 foundation (billing fields, usage counting, API client) | Create `middleware/usageEnforcement.ts` to check plan limits | Unit tests verifying limit enforcement behavior | Requests blocked when usage exceeds plan limits |
| Package 2 foundation (Shop type with plan field) | Create `middleware/entitlementCheck.ts` for feature access control | Unit tests verifying correct feature gating | Premium features accessible only to entitled plans |
| Package 2 foundation (billing API client) | Create `services/subscriptionValidator.ts` to validate against Shopify | Integration tests verifying accurate subscription status | Local state reconciled with Shopify source of truth |
| Package 2 foundation (usage_reset_at field) | Create `jobs/usageResetJob.ts` for automated usage reset | Manual verification of reset timing and accuracy | Usage counters reset correctly at billing cycle boundaries |
| Package 2 foundation (API client and webhook infrastructure) | Create `jobs/billingSyncJob.ts` for billing state synchronization | Integration tests verifying successful synchronization | Local billing state matches Shopify subscription data |
| Package 2 foundation (isProtectedOrder function) | Create `lib/usage/limitEvaluator.ts` for plan limit logic | Unit tests verifying accurate limit evaluations | Correct limit calculations for all plan tiers |
| Package 2 foundation (billing webhook infrastructure) | Update `lib/shopify/register.ts` for enforcement webhooks | Manual verification of webhook registration | Enforcement-related webhooks registered during sync |
| Package 2 foundation (environment validation) | Update `lib/env.ts` for enforcement config validation | Application starts successfully with valid config | Clear errors for missing enforcement configuration |
| All components implemented | Run full test suite: `npm test` | All tests pass | No regressions in existing functionality; new enforcement features tested |
| All components implemented | Run typecheck: `npm run typecheck` | No TypeScript errors | Strong typing maintained throughout new implementation |
| All components implemented | Run lint: `npm run lint` | No linting errors | Code follows project styling conventions |
| All components implemented | Run build: `npm run build` | Successful production build | Application bundles correctly for deployment |

## 7 Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Performance Impact: Middleware Latency** | Additional middleware checks could increase request latency | - Implement efficient database queries with proper indexing<br>- Add caching for frequently accessed subscription/plan data<br>- Benchmark middleware performance before/after implementation<br>- Keep logic in hot path minimal and focused |
| **Technical Risk: Shopify API Rate Limits** | Frequent subscription validation calls could hit Shopify API rate limits | - Implement intelligent caching of subscription validation results<br>- Use webhook-driven updates where possible to reduce polling<br>- Implement exponential backoff for rate limit errors<br>- Monitor API usage and adjust validation frequency accordingly |
| **Migration Risk: Schema Constraints** | Adding enforcement logic requires existing usage counting to be accurate | - Ensure Package 2 usage counting is thoroughly validated<br>- Implement graceful degradation if usage data is missing<br>- Add validation checks for usage data integrity<br>- Provide manual reset mechanisms for data correction |
| **Regression Risk: False Positives/Negatives** | Enforcement logic could incorrectly block or allow access | - Comprehensive unit testing of edge cases (boundary conditions, trial states)<br>- Implement detailed logging for enforcement decisions<br>- Provide override mechanisms for emergency access<br>- Gradual rollout with monitoring and alerting |
| **Operational Risk: Usage Reset Timing Issues** | Incorrect usage reset timing could lead to inaccurate enforcement | - Align reset logic with billing cycle timestamps from Shopify<br>- Implement verification checks before and after reset operations<br>- Provide manual reset capabilities for administrative correction<br>- Monitor reset job execution and alert on failures |
| **Technical Risk: State Inconsistency During Sync Windows** | Temporary inconsistencies during synchronization could cause incorrect enforcement | - Implement short grace periods during known sync windows<br>- Use timestamp-based validation to prevent rapid state fluctuations<br>- Add hysteresis to prevent frequent state changes near limits<br>- Log and alert on enforcement decisions made during sync windows |

## 8 Testing Strategy

### Unit Tests
- `middleware/usageEnforcement.test.ts` - Test plan limit enforcement logic
- `middleware/entitlementCheck.test.ts` - Test feature access control logic
- `middleware/subscriptionStatusCheck.test.ts` - Test subscription status verification
- `services/subscriptionValidator.test.ts` - Test subscription validation against mocked Shopify API
- `jobs/usageResetJob.test.ts` - Test usage reset timing and accuracy
- `jobs/billingSyncJob.test.ts` - Test billing state synchronization logic
- `lib/usage/limitEvaluator.test.ts` - Test plan limit evaluation for all tiers

### Integration Tests
- Test end-to-end flow: usage accumulation → limit enforcement → reset cycle
- Test subscription validation with various Shopify API responses (active, past due, canceled)
- Test entitlement checks across all plan tiers and feature combinations
- Test webhook handling for enforcement-related events (usage limit warnings, etc.)
- Test integration between enforcement middleware and existing detection pipelines

### Manual Verification
- Verify enforcement middleware correctly blocks requests when limits exceeded
- Confirm entitlement checks properly restrict feature access by plan tier
- Check that subscription validation accurately reflects Shopify subscription state
- Validate that usage reset occurs at correct billing cycle boundaries
- Confirm billing state synchronization keeps local state aligned with Shopify
- Test edge cases: trials, grace periods, plan changes, cancellations

### Regression Testing
- Full existing test suite: `npm test` (should pass 43+ existing tests)
- TypeScript typecheck: `npm run typecheck` (should pass with no new errors)
- Linting: `npm run lint` (should pass with no new errors)
- Build verification: `npm run build` (should produce successful production bundle)

### Package-Specific Validation Steps
1. **Enforcement Test**: Simulate usage accumulation past plan limit and verify detection requests are blocked
2. **Entitlement Test**: Attempt to access premium features from different plan tiers and verify correct access
3. **Subscription Validation Test**: Manipulate local subscription state and verify synchronization with Shopify
4. **Reset Timing Test**: Verify usage counters reset correctly at simulated billing cycle boundaries
5. **State Synchronization Test**: Confirm local billing state updates correctly when Shopify subscription changes

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
npm run test:enforcement -- --testNamePattern="enforcement"
npm run test:entitlement -- --testNamePattern="entitlement"
npm run test:subscriptionValidation -- --testNamePattern="subscription validation"
```

## 9 Rollback Strategy

### If Deployment Fails:
1. **Immediate Response**: 
   - Stop routing traffic to new deployment
   - Alert engineering team via monitoring systems
   - Preserve logs for forensic analysis

2. **Rollback Procedure**:
   - Redeploy previous known-good version (Package 2 foundation)
   - No database rollback required (changes are additive and backward compatible)
   - Verify health checks pass for core functionality (auth, sync, detection)
   - Confirm existing merchants can still access dashboard and settings

3. **Recovery Verification**:
   - Core authentication flow: `/api/auth/callback` successful
   - Sync functionality: `/api/sync` processes shops without errors
   - Detection engine: Existing alerts still generated correctly
   - Settings API: `/api/settings` GET/POST works for non-billing fields
   - Webhook processing: Existing webhooks (refunds/create, app/uninstalled) still functional
   - Health check endpoint returns valid status

### Specific Considerations for This Package:
- **Middleware Addition**: New enforcement middleware can be safely removed by redeploying previous version
- **Background Jobs**: New jobs can be disabled without affecting core functionality
- **Database**: No schema changes required (uses existing billing fields)
- **Backward Compatibility**: All changes designed to be backward compatible:
  - New middleware fails open (allows access) if configuration is missing
  - Background jobs have safe defaults and error handling
  - Existing functionality unaffected by new enforcement layers
- **Feature Flags**: Not required as changes are backward compatible additive; enforcement can be disabled via configuration

## 10 Definition of Done

| Acceptance Criterion | Measurement Method |
|----------------------|-------------------|
| ✓ Usage enforcement works | Manual test: Produce usage past plan limit, verify detection requests blocked; Verify access restored after usage reset |
| ✓ Entitlement checks functional | Manual test: Attempt to access premium features from different tiers, verify correct access restrictions |
| ✓ Subscription validation accurate | Manual test: Change subscription state in Shopify, verify local state updates through validation/synchronization |
| ✓ Usage reset logic correct | Manual test: Simulate billing cycle boundary, verify usage counters reset accurately |
| ✓ Billing state synchronization reliable | Manual test: Modify subscription in Shopify, verify local state converges to correct values |
| ✓ No regression in existing functionality | Test suite: `npm test` passes all existing tests; Build: `npm run build` succeeds |
| ✓ Enforcement middleware performs adequately | Performance testing: Middleware adds <50ms latency to request processing under load |
| ✓ Edge cases handled properly | Unit tests: Boundary conditions (exactly at limit, trial states, grace periods) all handled correctly |
| ✓ Logging and monitoring effective | Manual verification: Enforcement decisions logged appropriately for audit and debugging |
| ✓ Configuration validation works | Unit tests: Validation fails appropriately for missing/invalid enforcement config |

## 11 Engineering Readiness

**READY FOR IMPLEMENTATION**

### Justification:
All prerequisites for Package 3 implementation are satisfied:
1. **Repository is source of truth**: Package 2 foundation is fully implemented and verified
2. **Product Owner documents are authoritative**: 
   - Usage Metric: Protected Orders (foundation work approved - enforcement approved for Package 3)
   - Feature Tiering: Progressive feature allocation across tiers (APPROVED)
   - Shopify Billing Integration: Leverage Shopify's native billing infrastructure via API (APPROVED)
   - Data Model Extensibility: Extend shops table with billing fields (APPROVED)
3. **No outstanding blockers**: 
   - Usage Metric requires beta education validation (does not block enforcement implementation)
   - Pricing Tiers require validation data (does not block enforcement logic implementation)
   - Profitability Timeline adjustment does not impact technical implementation of enforcement
4. **Repository does not contradict Product Owner documents**: 
   - Existing Package 2 foundation provides all necessary components for Package 3 implementation
   - No work proposed exceeds the scope defined in Package Goals section
   - All implementation items map to approved Product Owner decisions
5. **Ambiguity resolved**: 
   - Scope explicitly defined as enforcement only (no pricing, UI, analytics, etc.)
   - Implementation order follows logical dependencies
   - Risks identified with concrete mitigations
   - Definition of Done includes objective, measurable criteria

Engineering may proceed with implementation of Package 3: Usage Tracking & Subscription Enforcement immediately, as all Product Owner decisions affecting this package have been APPROVED and the technical foundation exists in Package 2. The outstanding blockers identified in the billing review pertain to pricing validation and trial education, which do not prevent foundational enforcement work.