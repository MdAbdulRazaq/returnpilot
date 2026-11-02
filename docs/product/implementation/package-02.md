# Shopify Billing Integration Foundation - Package 2 Implementation Contract

## 1 Executive Summary

### Objective
Implement foundational Shopify Billing API integration to enable subscription management capabilities for ReturnPilot merchants, establishing the technical foundation for billing operations without implementing pricing logic, feature gating, or user-facing components.

### Engineering Purpose
Establish secure, reliable connection to Shopify's Billing API to create, manage, and query subscriptions; handle billing-related webhooks; and maintain synchronization between ReturnPilot's data model and Shopify's billing system as the foundational layer for future billing feature implementation.

### Repository Context
ReturnPilot already implements Shopify OAuth token encryption/storage (M3), order/refund/return sync (M4), and detection engine (M5). The shops table includes a nullable `plan` column (M9 Task 1). Package 2 builds upon existing Shopify API client (`lib/shopify/graphql.ts`) and webhook handling infrastructure to add billing-specific capabilities.

## 2 Repository Evidence

| Path | Why It Matters | Dependency |
|------|----------------|------------|
| `lib/shopify/graphql.ts` | Core Shopify API client handling auth, retries, throttling - foundation for billing API calls | Required for all Shopify API interactions |
| `lib/shopify/webhooks.ts` | Existing webhook verification and routing infrastructure | Extension point for billing webhooks (`shopify_billing_webhooks`) |
| `lib/shopify/register.ts` | Webhook registration logic used during sync | Pattern to follow for billing webhook registration |
| `lib/supabase/admin.ts` | Supabase admin client with Shop type definition | Requires extension for billing fields |
| `database/0004_billing_plan.sql` | Existing nullable `plan` column in shops table | Foundation for billing data model extension |
| `lib/env.ts` | Environment variable validation | Will need to validate new billing-related config |
| `app/(dashboard)/settings/page.tsx` | Existing settings page UI | Reference for where billing management UI would later be added (out of scope for P2) |
| `lib/rate-limit.ts` | Existing rate limiting implementation | Pattern to follow for billing API rate limiting |

## 3 Scope

| Requirement | Repository Evidence | Product Owner Decision Reference |
|-------------|---------------------|----------------------------------|
| Implement Shopify Billing API client wrapper for subscription creation/query/cancellation | `lib/shopify/graphql.ts` (existing pattern) | docs/product/billing_decisions.md: "Shopify Billing Integration: Leverage Shopify's native billing infrastructure via API" |
| Handle Shopify billing webhooks (subscription events) with HMAC verification | `lib/shopify/webhooks.ts` (existing pattern) | docs/product/billing_decisions.md: "Shopify Billing Integration: Leverage Shopify's native billing infrastructure via API" |
| Extend Shop type definition with billing fields (plan, billing_active, trial timestamps, etc.) | `lib/supabase/admin.ts` (ShopRow definition) | docs/product/billing_decisions.md: "Data Model Extensibility: Extend shops table with billing fields" |
| Implement webhook handlers for subscription_created, subscription_updated, subscription_cancelled events | `app/api/webhooks/` directory structure | docs/product/billing_decisions.md: "Shopify Billing Integration: Leverage Shopify's native billing infrastructure via API" |
| Create database migration for billing fields in shops table | `database/0004_billing_plan.sql` (existing pattern) | docs/product/billing_decisions.md: "Data Model Extensibility: Extend shops table with billing fields" |
| Implement usage tracking foundation (protected orders counting) without enforcement | `lib/shopify/sync.ts` (order processing) | docs/product/billing_decisions.md: "Usage Metric: Protected Orders" (foundation only - enforcement in later packages) |
| Add audit logging for billing events | `lib/supabase/admin.ts` (existing patterns) | docs/product/billing_decisions.md: implied through data model extensibility |

## 4 Explicitly Out of Scope

| Item | Reason for Exclusion |
|------|----------------------|
| Pricing logic and plan definitions | Explicitly prohibited: "Do NOT include: pricing changes" - Product Owner decisions on pricing tiers require validation before implementation |
| Feature gating based on plan | Explicitly prohibited: "Do NOT include: feature gating" - Feature allocation to tiers requires justification before implementation |
| Dashboard UI for billing management | Explicitly prohibited: "Do NOT include: dashboard UI" - UI components belong in later packages |
| Merchant analytics and reporting | Explicitly prohibited: "Do NOT include: merchant analytics" - Analytics require usage tracking foundation first |
| Billing reports and invoices | Explicitly prohibited: "Do NOT include: billing reports, invoices" - Reporting depends on completed usage tracking |
| Notifications (email/banner) for billing events | Explicitly prohibited: "Do NOT include: notifications" - Notification systems belong in later packages |
| Enterprise-specific features (SLAs, custom contracts) | Explicitly prohibited: "Do NOT include: enterprise features" - Enterprise features require foundation completion first |
| Usage-based enforcement (hard limits, overage charges) | Explicitly prohibited: "Do NOT include: usage tracking" - Enforcement requires Package 2 foundation + Package 3 implementation |
| Proration calculations for plan changes | Explicitly prohibited: "Do NOT include: pricing changes" - Proration depends on defined pricing tiers |
| Trial-to-paid conversion flows | Explicitly prohibited: "Do NOT include: dashboard UI" - Conversion flows require UI components |
| Payment method management | Explicitly prohibited: "Do NOT include: dashboard UI" - Payment UI belongs in settings page (later package) |
| Webhook endpoints for non-billing events (refunds/create, app/uninstalled) | Already implemented in M4 - Package 2 only adds billing-specific webhooks |

## 5 Files Expected To Change

| File | Reason | Type of Change | Risk |
|------|--------|----------------|------|
| `lib/shopify/billing.ts` | New file: Shopify Billing API client wrapper | New file creation | Low - isolated implementation |
| `lib/supabase/admin.ts` | Extend ShopRow interface and add billing field types | Interface extension, type additions | Low - backward compatible additive change |
| `database/0005_billing_fields.sql` | New migration: Add billing fields to shops table | New migration file | Low - additive schema change |
| `lib/shopify/webhooks.ts` | Add billing webhook verification and routing | Function additions, route extensions | Low - follows existing webhook patterns |
| `app/api/webhooks/shopify-billing/[...]/route.ts` | New directory/files: Billing webhook handlers | New file creation | Low - isolated implementation |
| `lib/shopify/sync.ts` | Add protected orders counting during sync processing | Function modification | Medium - modifies core sync logic (but read-only counting) |
| `lib/env.ts` | Add validation for new billing-related environment variables | Function extension | Low - additive validation |
| `lib/supabase/admin.ts` | Add billing event audit logging functions | Function additions | Low - isolated implementation |
| `lib/shopify/register.ts` | Extend webhook registration to include billing webhooks | Function modification | Low - follows existing registration patterns |

## 6 Implementation Order

| Prerequisite | Action | Validation | Expected Result |
|--------------|--------|--------------|-----------------|
| Completed M9 Task 1 (nullable plan column) | Create `lib/shopify/billing.ts` with Shopify Billing API client wrapper | Unit tests for API wrapper functions | Secure client for Shopify Billing API subscriptions operations |
| Existing Shop type definition | Extend `lib/supabase/admin.ts` with billing fields in ShopRow interface | TypeScript typecheck passes | Shop type includes billing fields without breaking existing usage |
| Existing database schema | Create `database/0005_billing_fields.sql` migration adding billing fields to shops table | Migration applies cleanly to test database | Shops table contains billing fields (plan, billing_active, trial_started_at, etc.) with correct defaults |
| Existing webhook infrastructure | Extend `lib/shopify/webhooks.ts` to handle billing webhook verification | Unit tests for billing webhook verification | Billing webhooks verified via HMAC-SHA256 before processing |
| Webhook verification in place | Create `app/api/webhooks/shopify-billing/[...]/route.ts` handlers for subscription events | Manual verification of webhook endpoints | Shopify billing events properly processed and logged |
| Extended Shop type | Add protected orders counting logic to `lib/shopify/sync.ts` (read-only, no enforcement) | Unit tests verifying count accuracy | Protected orders increment correctly during sync without affecting existing functionality |
| Billing event types defined | Add audit logging functions for billing events in `lib/supabase/admin.ts` | Unit tests for audit logging | Billing events (subscription changes, etc.) logged to BillingEvent table |
| Environment variables defined | Add billing-related config validation to `lib/env.ts` | Application starts successfully with valid config | Missing billing config causes clear startup error |
| Webhook registration logic | Extend `lib/shopify/register.ts` to register billing webhooks during sync | Integration test verifying webhook registration | Billing webhooks registered alongside existing webhooks during shop sync |
| All components implemented | Run full test suite: `npm test` | All tests pass | No regressions in existing functionality; new billing features tested |
| All components implemented | Run typecheck: `npm run typecheck` | No TypeScript errors | Strong typing maintained throughout new implementation |
| All components implemented | Run lint: `npm run lint` | No linting errors | Code follows project styling conventions |
| All components implemented | Run build: `npm run build` | Successful production build | Application bundles correctly for deployment |

## 7 Dependencies

### Internal Dependencies
- `lib/shopify/graphql.ts` - Provides authenticated Shopify API client with retry/throttle logic
- `lib/supabase/admin.ts` - Provides Supabase admin client and Shop type definition
- `lib/shopify/webhooks.ts` - Provides HMAC verification and webhook routing patterns
- `lib/shopify/register.ts` - Provides webhook registration logic used during shop sync
- `lib/shopify/sync.ts` - Provides order processing pipeline where protected orders counting will be added
- `lib/env.ts` - Provides environment variable validation framework
- `lib/rate-limit.ts` - Provides rate limiting patterns to follow for billing API

### External Dependencies
- `@supabase/supabase-js` v2.40.0 - Already used throughout codebase for Supabase interactions
- `zod` v3.23.0 - Already used for schema validation in environment handling

### Shopify Dependencies
- Shopify GraphQL Admin API - Used for all billing operations (already integrated via graphql.ts)
- Shopify Billing API - Specific endpoints for subscription management (newly utilized)
- Shopify Webhooks - Specifically `APP_SUBSCRIPTIONS_UPDATE` and related topics (newly utilized)
- Shopify API Version 2024-01 or later - Required for billing API compatibility

### Database Dependencies
- PostgreSQL via Supabase - Already used for all data storage
- shops table extension - Add billing fields to existing table (additive change)

### Configuration Dependencies
- `SHOPIFY_API_VERSION` - May need updating to ensure billing API compatibility
- New environment variables (to be added in `.env.example`):
  - `SHOPIFY_BILLING_API_VERSION` - Specific API version for billing endpoints
  - `SHOPIFY_WEBHOOK_SECRET` - May reuse existing or separate for billing webhooks (to be validated)

## 8 Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Technical Risk: Shopify API Changes** | Shopify modifies or deprecates billing API endpoints | - Use explicit API versioning in requests<br>- Implement API version monitoring<br>- Design client wrapper to be version-flexible<br>- Maintain backward compatibility layer where possible |
| **Migration Risk: Schema Changes** | Adding columns to production shops table could cause issues if not done properly | - Use `IF NOT EXISTS` in migration<br>- Test migration on copy of production schema<br>- Ensure nullable fields with appropriate defaults<br>- Verify migration is reversible |
| **Deployment Risk: Webhook Endpoint Configuration** | New webhook endpoints not properly configured in Shopify partner dashboard | - Document required webhook subscriptions<br>- Provide validation scripts<br>- Implement startup checks for webhook configuration<br>- Create clear error messages for misconfiguration |
| **Integration Risk: Billing Webhook Duplicates** | Receiving duplicate webhook events from Shopify causing inconsistent state | - Implement idempotency keys for all mutating operations<br>- Use unique constraints on billing events table<br>- Shopify-provided webhook IDs for deduplication |
| **Regression Risk: Sync Performance Impact** | Adding protected orders counting slows down order sync process | - Implement counting as lightweight increment operation<br>- Benchmark sync performance before/after<br>- Ensure counting only happens for orders with refunds<br>- Keep logic in hot path minimal and efficient |
| **Technical Risk: Billing Webhook Security** | Improper webhook validation leading to processing of fraudulent events | - Follow existing HMAC-SHA256 validation pattern exactly<br>- Use constant-time comparison for signatures<br>- Validate webhook freshness with timestamp checks<br>- Log all webhook attempts (success/failure) for audit |
| **Technical Risk: State Inconsistency** | Local billing state diverges from Shopify's source of truth | - Implement regular reconciliation jobs<br>- Design event handlers to be idempotent<br>- Use Shopify subscription ID as source of truth<br>- Add verification endpoints for manual checks |

## 9 Testing Strategy

### Unit Tests
- `lib/shopify/billing.test.ts` - Test billing API client wrapper functions
- `lib/supabase/admin.test.ts` - Test Shop type extensions and billing field handling
- `lib/shopify/webhooks.test.ts` - Test billing webhook verification logic
- `app/api/webhooks/shopify-billing/[...]/test.ts` - Test webhook handlers
- `lib/shopify/sync.test.ts` - Test protected orders counting accuracy

### Integration Tests
- Test end-to-end flow: webhook receipt → event processing → database update
- Test Shopify API client authentication and error handling
- Test database migration applies cleanly and is reversible
- Test webhook registration during shop sync process

### Manual Verification
- Verify webhook endpoints return correct HTTP status codes (200 for valid, 401 for invalid signature)
- Confirm billing events appear in BillingEvent table with correct data
- Check that protected orders increment correctly during sync for test shops
- Validate that existing authentication and sync flows remain unaffected
- Test error cases: invalid webhooks, API rate limits, network failures

### Regression Testing
- Full existing test suite: `npm test` (should pass 43+ existing tests)
- TypeScript typecheck: `npm run typecheck` (should pass with no new errors)
- Linting: `npm run lint` (should pass with no new errors)
- Build verification: `npm run build` (should produce successful production bundle)

### Package-Specific Validation Steps
1. **Shopify Connectivity Test**: Verify ability to authenticate to Shopify and query basic shop info via new billing client
2. **Webhook Verification Test**: Send test webhook payloads with valid/invalid signatures and verify correct handling
3. **Database Schema Test**: Apply migration to test database and verify shops table contains expected billing fields
4. **Usage Counting Test**: Run sync on test shop data and verify protected orders count increments correctly
5. **Event Processing Test**: Simulate billing webhook receipt and verify appropriate database updates

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
npm run test:billing -- --testNamePattern="billing"
npm run test:webhooks -- --testNamePattern="billing webhook"
```

## 10 Rollback Strategy

### If Deployment Fails:
1. **Immediate Response**: 
   - Stop routing traffic to new deployment
   - Alert engineering team via monitoring systems
   - Preserve logs for forensic analysis

2. **Rollback Procedure**:
   - Redeploy previous known-good version
   - No database rollback required (migration is additive and backward compatible)
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
- **Database Migration**: The `0005_billing_fields.sql` migration is additive (adding nullable columns with defaults) and can be safely applied/rolled back
- **Backward Compatibility**: All changes are designed to be backward compatible:
  - New Shop type fields are optional in existing code paths
  - New webhook endpoints don't affect existing routes
  - Counting logic in sync is read-only and doesn't alter existing data flow
  - Environment variable validation fails gracefully if missing (existing behavior)
- **Feature Flags**: Not required for this package as all changes are backward compatible additive

## 11 Definition of Done

| Acceptance Criterion | Measurement Method |
|----------------------|-------------------|
| ✓ Shopify billing flow works | Manual test: Create subscription via API, verify in Shopify admin and ReturnPilot database |
| ✓ Existing authentication unchanged | Automated test: OAuth flow completes successfully; manual verification: existing shops can re-authenticate |
| ✓ Existing merchants unaffected | Regression test: All existing unit tests pass; manual verification: pre-existing shops sync and detect alerts normally |
| ✓ No regression | Test suite: `npm test` passes all existing tests; Build: `npm run build` succeeds |
| ✓ Tests pass | Unit tests: All new billing-related tests pass; Integration tests: end-to-end scenarios validated |
| ✓ Build passes | `npm run build` produces successful production bundle without errors |
| ✓ Shopify billing API client functions correctly | Unit tests: All billing API wrapper functions tested with mocks; Integration tests: successful API calls to Shopify sandbox |
| ✓ Billing webhooks processed securely | Unit tests: HMAC validation works correctly; Manual tests: valid webhooks processed, invalid rejected |
| ✓ Protected orders counted accurately | Unit tests: counting logic returns correct values; Integration tests: sync increments count properly |
| ✓ Audit logging functional | Unit tests: event logging writes to database; Manual tests: billing events appear in BillingEvent table |
| ✓ Environment validation works | Unit tests: validation fails appropriately for missing/invalid config; Manual tests: app starts with valid config |

## 12 Engineering Readiness

**READY FOR IMPLEMENTATION**

### Justification:
All prerequisites for Package 2 implementation are satisfied:
1. **Repository is source of truth**: All code paths and data models examined
2. **Product Owner documents are authoritative**: 
   - Billing Model: Hybrid Tiered Subscription with Usage Components (APPROVED)
   - Shopify Billing Integration: Leverage Shopify's native billing infrastructure via API (APPROVED)
   - Data Model Extensibility: Extend shops table with billing fields (APPROVED)
   - Usage Metric: Protected Orders (foundation work approved - enforcement in later packages)
3. **No outstanding blockers**: 
   - Usage Metric requires beta education validation (does not block foundation tracking implementation)
   - Pricing Tiers require validation data (does not block API integration foundation)
   - Profitability Timeline adjustment does not impact technical implementation
4. **Repository does not contradict Product Owner documents**: 
   - Existing `plan` column in shops table aligns with approved data model extensibility
   - Existing Shopify API client patterns provide foundation for billing integration
   - Existing webhook infrastructure supports extension for billing events
5. **Ambiguity resolved**: 
   - Scope explicitly defined as foundation only (no pricing, feature gating, UI)
   - Implementation order follows logical dependencies
   - Risks identified with concrete mitigations
   - Definition of Done includes objective, measurable criteria

Engineering may proceed with implementation of Package 2: Shopify Billing Integration Foundation immediately, as all Product Owner decisions affecting this package have been APPROVED and the technical foundation exists in the repository. The outstanding blockers identified in the review pertain to later packages (pricing, feature gating, enforcement) and do not prevent foundational work.