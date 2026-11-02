# ReturnPilot Billing Product Specification

## 1 Executive Summary

### Why Billing Exists
ReturnPilot's billing system exists to monetize the core value proposition: preventing financial losses from refunds issued without confirmed returns. As the product evolves from a free detection tool to a sustainable business, billing enables continued development, support, and innovation while aligning merchant costs with the value received.

### Business Goals
- Achieve profitability within 12 months of billing launch
- Maintain >90% merchant retention rate through clear value demonstration
- Generate sufficient revenue to fund ongoing development and support
- Establish ReturnPilot as the essential financial protection tool for Shopify merchants

### Merchant Value
Merchants pay ReturnPilot to protect their bottom line by:
- Preventing refund fraud and accidental over-refunds
- Automating detection that would otherwise require manual reconciliation
- Providing peace of mind through proactive alerts rather than reactive discovery
- Saving operational time and reducing accounting complexities

### Revenue Strategy
ReturnPilot employs a tiered subscription model based on merchant store volume and protection level, ensuring fair pricing that scales with the merchant's business size and risk exposure.

### Success Metrics
- Monthly Recurring Revenue (MRR) growth
- Customer Acquisition Cost (CAC) payback period < 6 months
- Net Revenue Retention (NRR) > 110%
- Merchant satisfaction score (NPS) > 40
- Alert accuracy and timeliness SLAs met 95% of the time

## 2 Product Vision

### What Merchants Experience
Merchants experience ReturnPilot as a silent guardian that continuously monitors their Shopify store for refund discrepancies, alerts them to potential losses, and provides simple tools to review and act on those alerts—all through an intuitive dashboard and optional email digests.

### Problems Billing Solves
Billing transforms ReturnPilot from a project into a sustainable business by:
- Funding ongoing Shopify API maintenance and compatibility
- Supporting customer success and technical support teams
- Enabling feature development based on merchant feedback
- Covering infrastructure costs (Supabase, Vercel, Resend)
- Ensuring long-term product viability and trust

### UX Philosophy
- **Simplicity First**: Minimal setup, clear value demonstration
- **Progressive Disclosure**: Advanced features available when needed
- **Trust Through Transparency**: Clear billing, understandable charges, easy cancellation
- **Value-Aligned Pricing**: Merchants pay more as they protect more revenue

### Simplicity Goals
- One-click billing activation from settings
- Clear, predictable monthly charges
- No hidden fees or complex usage calculations
- Easy plan changes without service interruption
- Straightforward cancellation with data export options

## 3 Merchant Journey

### Install App
1. Merchant discovers ReturnPilot via Shopify App Store or marketing
2. Clicks "Install app" and is redirected to OAuth consent screen
3. Grants `read_orders,read_returns` permissions (clearly explained as needed for refund monitoring)
4. Completes installation and is redirected to ReturnPilot dashboard
5. Sees onboarding welcome message explaining next steps

### Onboarding
1. Automatic shop verification and secure token storage (AES-256-GCM)
2. Initial sync begins (last 60 days of orders due to Shopify API limitations)
3. Dashboard shows "Setting up your protection..." status during initial sync
4. First email digest scheduled based on installation time
5. Settings page pre-configured with recommended defaults (email alerts enabled)

### Trial
14-day free trial period begins immediately upon installation:
- Full access to all Pro tier features during trial
- Dashboard fully functional with real-time alerts as data syncs
- Email digests active if notifications enabled
- Clear trial expiration messaging in dashboard and emails
- No payment method required upfront (reduces friction)
- Day 3 and day 7 trial reminder emails highlighting value received
- Day 13 expiration warning with upgrade prompts

### Subscription
Upon trial completion or immediate upgrade:
- Merchant enters payment details via Shopify Billing API secure flow
- First prorated charge applied based on remaining trial days
- Subscription becomes active with selected plan (Starter/Growth/Pro/Enterprise)
- Confirmation email sent with receipt and next steps
- Dashboard shows active subscription status and next billing date
- Usage metrics begin tracking against plan limits

### Daily Usage
- Dashboard loads within 2 seconds showing current protection status
- Alert table displays new/refreshed findings with severity indicators
- One-click alert review/dismissal workflow
- Email digest delivers each morning at merchant's preferred time
- Settings accessible for notification preferences and billing management
- Real-time sync indicator shows last successful sync time

### Upgrade
Available anytime from settings or upgrade prompts:
- Clear comparison of current vs. target plan features/limits
- Prorated charge calculation shown before confirmation
- Immediate access to higher tier features upon upgrade
- Usage metrics reset appropriately for new plan limits
- Confirmation email with updated subscription details

### Downgrade
Available at end of current billing period:
- Warning about feature/limit reductions that will take effect
- Option to schedule downgrade for next billing cycle
- Immediate effect if downgrading to free tier (data preserved)
- Confirmation of which alerts/features will become read-only
- No prorated refunds for downgrades within billing period

### Cancellation
Available anytime with immediate effect:
- Clear explanation of data retention and access post-cancellation
- Option to provide cancellation reason (improves product)
- Confirmation that access continues until end of paid period
- Data export available for 30 days post-cancellation
- Follow-up email with export link and re-engagement offer

### Reactivation
Simple process for former subscribers:
- Recognized as returning merchant upon reinstall
- Previous settings and preferences optionally restored
- New 14-day trial offered to re-evaluate value
- Seamless transition back to paid subscription if satisfied
- Welcome back messaging acknowledging prior relationship

## 4 Billing Model

### Recommended Model: Hybrid Tiered Subscription with Usage Components

#### Why This Model
After evaluating alternatives, the hybrid model best balances merchant fairness, business sustainability, and alignment with ReturnPilot's core value proposition:

1. **Predictable Revenue**: Base subscription ensures steady cash flow
2. **Value Alignment**: Usage components charge more for higher protection needs
3. **Scalability**: Accommodates stores from small boutiques to enterprise brands
4. **Shopify Integration**: Leverages native billing infrastructure merchants already trust
5. **Fairness**: Merchants only pay for what they need and use

#### Alternative Models Evaluated

##### Pure Subscription (Fixed Tiers)
- **Pros**: Simplest to understand and implement, predictable revenue
- **Cons**: Doesn't scale with merchant size, overcharges small stores, undercharges large stores
- **Verdict**: Rejected - doesn't align value with cost

##### Pure Usage-Based
- **Pros**: Perfectly aligned with value received, fair for all sizes
- **Cons**: Revenue volatility, difficult for merchants to predict costs, complex metering
- **Verdict**: Rejected - creates billing anxiety and support burden

##### Hybrid (Selected)
- **Pros**: Combines predictability of subscription with fairness of usage
- **Cons**: Slightly more complex to explain, requires two-dimensional pricing
- **Verdict**: Selected - optimal balance for merchant satisfaction and business health

#### Trade-Offs Addressed
- **Complexity vs. Fairness**: Solved through clear communication and tier design
- **Implementation Effort vs. Long-term Value**: Accepted complexity for sustainable model
- **Merchant Confusion vs. Precision**: Addressed through education and transparent metrics

## 5 Pricing Strategy

### Plans & Pricing

| Plan | Monthly Price | Protected Orders/month | Features | Ideal For |
|------|---------------|------------------------|----------|-----------|
| **Free** | $0 | Up to 50 | Basic detection, dashboard view, email digests (weekly) | Testing, very low volume stores |
| **Starter** | $9/month | Up to 200 | All Free + priority support, customizable alerts | Small businesses, startups |
| **Growth** | $29/month | Up to 1,000 | All Starter + advanced filtering, export capabilities | Growing businesses |
| **Pro** | $79/month | Up to 5,000 | All Growth + API access, dedicated support | Established brands |
| **Enterprise** | Custom | 5,000+ | All Pro + SLA, custom integrations, account manager | High-volume, complex operations |

### Value Proposition
Merchants pay ReturnPilot because:
- **Direct ROI**: Average merchant prevents $500-$5,000+ in monthly refund losses
- **Time Savings**: Eliminates 2-10+ hours/month of manual reconciliation
- **Risk Mitigation**: Protects against both fraudulent and accidental over-refunds
- **Comfort**: Reduces anxiety about unknown financial leaks
- **Professionalism**: Shows customers and accounting teams disciplined financial controls

### Competitive Positioning
vs. Alternatives:
- **Manual Reconciliation**: $0 cost but high labor cost and error-prone
- **Generic Accounting Tools**: Detect anomalies but not specialized for Shopify refunds
- **Competing Return Protection Apps**: Often charge % of saved revenue (less transparent) or higher flat fees
- **ReturnPilot Advantage**: Specialized focus, transparent pricing, proven detection engine

### Why Merchants Would Pay
1. **Immediate, Tangible Value**: Alerts represent actual recoverable funds
2. **Low Risk to Try**: 14-day free trial demonstrates value before payment
3. **Predictable Costs**: Flat monthly fee eliminates billing surprises
4. **Trust Through Specialization**: Single-purpose tool does one thing exceptionally well
5. **Growth Alignment**: Plans scale naturally with business expansion

## 6 Feature Matrix

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

## 7 Usage Model

### What Is Billed: Protected Orders
ReturnPilot bills based on the number of **protected orders** per billing cycle, defined as:

**Protected Order** = Any Shopify order containing at least one refund line item that falls within the looked-back time window (default 60 days, configurable up to 90 days for Enterprise).

### Why This Metric
1. **Directly Correlates with Risk**: More orders = more refund opportunities = higher protection value
2. **Aligns with Detection Workload**: More protected orders = more data to process and analyze
3. **Merchant Understandable**: Store owners intuitively grasp order volume as a business metric
4. **Difficult to Game**: Unlike counting alerts (which could be manipulated), order volume is objective
5. **Scales Naturally**: Growing stores see proportional cost increases matching their protection needs

### Usage Calculation
- Counted at the time of sync/order processing
- Each unique order ID counted once per billing period regardless of number of refunds
- Orders without refunds are not counted toward protection limits
- Grace period of 10% overage before enforcement (with notification)
- Hard limit enforcement prevents new protection; existing alerts remain visible

### Alternative Models Considered
- **Protected Refunds**: Over-charges merchants with multi-line-item refunds
- **Monitored Stores**: Doesn't scale with store size/activity
- **API Usage**: Doesn't reflect core value (protection, not integration)
- **Revenue Protected**: Impossible to measure accurately without merchant financial data

## 8 Billing Lifecycle

### State Machine

```mermaid
stateDiagram-v2
    [*] → Trial: Install app
    Trial → Active: Payment method added OR Upgrade during trial
    Trial → Expired: 14 days elapsed no payment
    Trial → Canceled: Merchant explicitly cancels during trial
    Active → Past Due: Payment failed
    Past Due → Active: Successful payment retry
    Past Due → Canceled: 3 consecutive failed payments
    Active → Paused: Merchant initiated pause (max 90 days)
    Paused → Auto-resume: Pause period ended
    Paused → Canceled: Merchant chooses not to resume
    Active → Downgraded: Plan change effective next billing cycle
    Active → Upgraded: Plan change effective immediately/prorated
    Active → Canceled: Merchant initiated cancellation
    Expired → Reactivated: Reinstall + new trial
    Canceled → Reactivated: Reinstall + new trial (if within 90 days)
    [*] → Blocked: Fraud detected/legal issue
```

### Key Transitions

**Trial Expires** (Day 14):
- Dashboard shows upgrade prompt with plan selection
- Email sequence: Day 13 (warning), Day 14 (expiration), Day 15 (final notice)
- Detection continues but new alerts not generated
- Existing alerts remain accessible for 7 days post-expiration
- Auto-transition to Free tier after 7-day grace period (limited features)

**Payment Fails**:
- First failure: Retry in 3 days, email notification
- Second failure: Retry in 7 days, urgent email + in-app banner
- Third failure: Subscription canceled, access suspended
- Recovery flow: Update payment method → reactivate immediately

**Merchant Reinstalls**:
- Recognized by shop domain + encrypted token (if still valid)
- Previous settings optionally restored based on opt-in during uninstall
- New trial period offered if previous tier based on prior relationship length
- Seamless continuation if within 30 days and paid recently

**Charge Declined**:
- Same as payment fails (retry logic applies)
- Webhook notification to prevent service interruption
- Merchant notified via email and dashboard banner

**Upgrade/Downgrade**:
- Upgrade: Immediate effect, prorated charge for remainder of period
- Downgrade: Effective at next billing date, prorated credit if applicable
- Both: Clear confirmation of feature/limit changes
- Usage counters reset appropriately for new plan

**Cancellation**:
- Access continues until end of paid period
- Data export available for 30 days
- Offboarding survey presented
- Win-back campaign after 30, 60, 90 days

**Expired Card**:
- Detected via payment processor webhook
- 7-day grace period with increasing urgency notifications
- Allows time for merchant to update payment method
- خدمة suspension only after grace period expiration

## 9 Shopify Integration

### Required APIs
1. **GraphQL Admin API**:
   - `orders` query (with `updated_at` filter for sync)
   - `orders/refunds` connection (refund line items, amounts)
   - `orders/returns` connection (return line items, quantities)
   - `shop` query (for basic store information during onboarding)
   - `app/subscriptions` read/write (via Shopify Billing API)
   - `application_credit` (for prorated refunds/adjustments)

2. **REST Admin API** (limited use):
   - `shop` resource (webhook management)
   - `webhook` subscriptions (mandatory GDPR + optional custom)

### Redirects
1. **Installation Flow**:
   - Merchant clicks "Install" in Shopify App Store
   - Redirect to ReturnPilot: `/api/auth?shop={shop_domain}`
   - After consent: Redirect to Shopify OAuth: `https://{shop}.myshopify.com/admin/oauth/authorize?...`
   - After auth: Redirect back to ReturnPilot: `/api/auth/callback?code={code}&hmac={hmac}&state={state}&shop={shop}`

2. **Billing Flow** (Shopify Billing API):
   - From ReturnPilot settings: Redirect to Shopify billing confirmation
   - After approval: Redirect back to ReturnPilot billing success/failure page

3. **Webhook Endpoints**:
   - `app/uninstalled`: Handles clean merchant removal
   - `refunds/create`: Triggers near-real-time sync for fresh data
   - `shop/redact`: GDPR compliance (deferred to pre-launch)

### Merchant Approval Flow
1. **OAuth Consent**:
   - Clearly explains permissions: "Read orders and refunds to detect financial leaks"
   - No over-permissioning: Only requests minimum required scopes
   - Generic error messages prevent information leakage
   - State parameter prevents CSRF attacks

2. **Billing Consent**:
   - Integrated through Shopify's native billing interface
   - Merchant sees clear charge amount before confirming
   - One-time approval enables recurring charges via Shopify
   - Easy to view/manage/cancel directly in Shopify admin

### Billing Verification
1. **Webhook Validation**:
   - All webhooks verified via HMAC-SHA256 before processing
   - Uses `SHOPIFY_API_SECRET` for signature validation
   - Constant-time comparison to prevent timing attacks
   - Invalid payloads logged and discarded (no processing)

2. **Subscription Validation**:
   - Regular checks against Shopify's subscription API
   - Local state reconciled with Shopify source of truth
   - Discrepancies trigger verification flow and potential re-sync
   - Failed validations suspend protection until resolved

3. **Data Integrity**:
   - Shopify-sourced data validated during normalization
   - Missing or malformed fields handled gracefully
   - Sync cursors protected against corruption
   - Idempotency prevents duplicate processing

### App Installation Interaction
1. **Pre-install**:
   - App Store listing highlights value proposition and pricing
   - Support links and documentation easily accessible
   - Reviews and ratings visible for social proof

2. **During Install**:
   - Clear progress indicators
   - Minimal data collection (only what's necessary for function)
   - Immediate value demonstration begins during sync
   - Error states provide actionable guidance, not technical codes

3. **Post-install**:
   - Welcome tour highlights key dashboard features
   - Settings pre-optimized based on store size/type (when detectable)
   - First sync commencement with estimated completion time
   - Educational content about what to expect in first 24h

## 10 Data Model

### Entities

#### Shop (Extended)
- **Core Fields** (existing):
  - `id` (uuid, PK)
  - `shop_domain` (text, unique, not null)
  - `access_token_ciphertext` (text, nullable)
  - `access_token_iv` (text, nullable)
  - `access_token_tag` (text, nullable)
  - `token_key_version` (smallint, nullable)
  - `encrypted_at` (timestamptz, nullable)
  - `scope` (text, nullable)
  - `sync_cursor` (timestamptz, nullable)
  - `installed_at` (timestamptz, not null)
  - `uninstalled_at` (timestamptz, nullable)

- **Billing Fields** (new):
  - `plan` (text, nullable) - References plan tier (free/starter/growth/pro/enterprise)
  - `billing_active` (boolean, not null, default false) - Whether merchant has active paid subscription
  - `trial_started_at` (timestamptz, nullable) - When free trial began
  - `trial_ends_at` (timestamptz, nullable) - When trial ends/converts to paid
  - `subscription_id` (text, nullable) - Shopify Subscription ID for reconciliation
  - `next_billing_at` (timestamptz, nullable) - Next billing cycle date
  - `usage_current_period` (integer, not null, default 0) - Protected orders count in current period
  - `usage_reset_at` (timestamptz, not null) - When usage counter resets (typically billing date)
  - `cancelled_at` (timestamptz, nullable) - When cancellation was requested
  - `cancel_effective_at` (timestamptz, nullable) - When cancellation takes effect (end of period)

#### BillingEvent
- `id` (uuid, PK)
- `shop_id` (uuid, FK → shops.id, not null)
- `event_type` (text, not null) - trial_started, trial_ended, subscription_created, subscription_updated, subscription_cancelled, payment_failed, payment_succeeded, usage_limit_warned, etc.
- `event_data` (jsonb, nullable) - Context-specific data (amounts, plan changes, etc.)
- `created_at` (timestamptz, not null, default now())
- `processed_at` (timestamptz, nullable) - When internal systems handled the event

#### UsageSnapshot (for auditing/reporting)
- `id` (uuid, PK)
- `shop_id` (uuid, FK → shops.id, not null)
- `period_start` (timestamptz, not null)
- `period_end` (timestamptz, not null)
- `protected_orders_count` (integer, not null)
- `detected_alerts_count` (integer, not null)
- `money_at_risk_total` (numeric, not null)
- `created_at` (timestamptz, not null, default now())

### Relationships
- **Shop 1:many BillingEvent** (one shop can have many billing-related events)
- **Shop 1:many UsageSnapshot** (periodic snapshots for reporting and analytics)
- **Shop 1:many refund_alerts** (existing relationship unchanged)
- **Shop 1:1 settings** (existing relationship unchanged)

### Required Fields (for billing operation)
- `shop.shop_domain` (not null) - Store identifier
- `shop.plan` (not null when billing_active=true) - Current subscription tier
- `shop.billing_active` (not null) - Subscription status flag
- `shop.usage_reset_at` (not null) - Critical for usage period calculations
- `shop.usage_current_period` (not null) - Tracks against plan limits
- `BillingEvent.shop_id` (not null) - Links event to merchant
- `BillingEvent.event_type` (not null) - Determines event handling
- `UsageSnapshot.shop_id` (not null) - Links snapshot to merchant
- `UsageSnapshot.period_start/end` (not null) - Defines reporting period

### Purpose of Each Field
- **plan**: Determines feature access and base price tier
- **billing_active**: Quick boolean check for subscription status (avoids null plan checks)
- **trial_started_at/ends_at**: Manages trial lifecycle and conversion timing
- **subscription_id**: Enables reconciliation with Shopify's billing system
- **next_billing_at**: Powers expiration warnings and renewal processing
- **usage_current_period**: Real-time tracking against plan limits
- **usage_reset_at**: Defines when usage counter zeros (typically billing date)
- **cancelled_at/cancel_effective_at**: Handles grace period between request and effect
- **BillingEvent**: Audit trail for compliance, debugging, and customer service
- **UsageSnapshot**: Enables revenue forecasting, usage trend analysis, and business reporting

## 11 Dashboard Requirements

### Pages
1. **Dashboard/Home** (`/app/dashboard`):
   - Primary merchant interface after login
   - Shows current protection status and recent activity
   - Subscription status prominent in header

2. **Settings** (`/app/dashboard/settings:
   - Notification preferences
   - Billing management (plan change, payment method, usage)
   - Danger zone (data export, account deletion)

3. **Alert Details** (`/app/dashboard/alerts/[id]`):
   - Full refund/return analysis
   - Action buttons (review/dismiss/mark false positive)
   - Historical context for similar alerts

4. **Usage & Reports** (`/app/dashboard/usage`):
   - Current period usage vs. plan limits
   - Historical usage trends
   - Export controls and history

### Cards (Dashboard Home)
1. **Protection Status Card**:
   - Large, prominent display of current state
   - Color-coded: Green (active trial/paid), Yellow (trial ending), Red (payment issue)
   - Shows: "Your store is protected" or action Required text

2. **This Period's Usage Card**:
   - Protected orders used / included in plan (with progress bar)
   - Example: "234 / 1,000 protected orders used"
   - Warning state at 80%, critical at 95%

3. **Recent Alerts Card**:
   - Mini-table showing 3-5 most recent alerts
   - Shows: date, order #, reason, money at risk, status
   - "View all alerts" link to full table

4. **Next Billing/Card**:
   - Shows next billing date and amount
   - For trial: "Trial ends in X days - upgrade to continue"
   - For paid: "Next bill: $X.XX on DATE"
   - Link to detailed billing page

### Metrics
- **Protected Orders This Period**: Primary usage metric
- **Money at Risk (Current)**: Total value of open alerts
- **Money Protected (Lifetime)**: Cumulative value of addressed alerts
- **Alert Resolution Rate**: % of alerts reviewed/dismissed
- **Sync Status**: Last successful sync time and status
- **False Positive Rate**: % of alerts marked as incorrect (merchant feedback)

### Warnings
- **Trial Ending**: Banner 3 days before trial end with upgrade CTA
- **Usage Limit Approaching**: Banner at 80% and 95% of plan limit
- **Payment Issue**: Immediate banner on failed payment with retry CTA
- **Webhook Issues**: Alert if Shopify webhook verification repeatedly fails
- **Sync Problems**: Warning if no successful sync in >25 hours

### Upgrade Prompts
- **Contextual**: Appears when attempting to access premium feature
- **Value-Based**: Shows specific benefit they'd gain ("Unlock CSV export to analyze trends")
- **Timing**: Trial-based (days 3,7,13), usage-based (80%, 95%), feature-based
- **Non-Intrusive**: Dismissible banners, not modal interruptions unless critical

### Usage Display
- Real-time counter updates (every 5-15 minutes via cache)
- Clear visualization of progress toward limit
- Forecast: "At current rate, you'll reach limit in ~X days"
- Historical: Sparkline showing last 4 weeks of usage

### Invoices Section
- List of all past invoices with amounts and dates
- Downloadable PDF receipts for each
- Tax/VAT breakdown where applicable
- Link to update billing address/tax ID

### Subscription Status Indicators
- **Active Trial**: Blue badge with days remaining
- **Active Paid**: Green badge with renewal date
- **Past Due**: Red banner with payment retry button
- **Canceled (Access Until)**: Orange badge with end date
- **Paused**: Purple badge with resume date
- **Expired**: Gray banner with reactivation CTA

## 12 Notifications

### Emails
1. **Welcome/Onboarding Series**:
   - Day 0: Installation confirmation + what to expect
   - Day 3: Trial reminder + value highlights ("You've prevented $X in potential losses")
   - Day 7: Mid-trial check-in + advanced tips
   - Day 13: Trial ending tomorrow + upgrade prompt
   - Day 14: Trial expired + limited access notice
   - Day 15: Final notice + data export availability

2. **Billing Related**:
   - Payment successful: Receipt + next billing date
   - Payment failed: Immediate notice + retry link (3 attempts)
   - Subscription updated: Confirmation of plan change + proration details
   - Usage warning: 80% and 95% of limit reached
   - Subscription canceled: Confirmation + access end date
   - Reactivation welcome: "Welcome back!" + new trial offer

3. **Alert Related**:
   - **Immediate Alert**: ForPro+ tiers when high-value alert detected (>$500 at risk)
   - **Daily Digest**: Summary of new alerts since last email
   - **Weekly Summary**: For Free tier - weekly protection report
   - **Monthly Statement**: Protected orders count, money protected, trends

4. **Operational**:
   - Sync failure: After 3 consecutive failed attempts
   - Security alert: Password change, new device login (if auth added)
   - Service announcement: Planned maintenance, feature releases

### Banner Alerts (In-App)
- **Persistent**: Until dismissed or issue resolved
- **Types**: info, warning, error, success
- **Positions**: Top of dashboard (below header), non-obtrusive
- **Actions**: Primary CTA, secondary info/link, dismiss (X)

1. **Trial Ending Soon**:
   - Yellow background, "Your trial ends in 3 days. Upgrade now to keep protection."
   - Primary: "Choose Plan", Secondary: "Remind me tomorrow", Dismissable

2. **Usage Limit Warning**:
   - Orange background, "You've used 90% of your protected orders. Consider upgrading."
   - Primary: "View Usage", Secondary: "Learn about plans", Dismissable after action

3. **Payment Failed**:
   - Red background, "Payment failed. Update your method to avoid service interruption."
   - Primary: "Update Payment", Secondary: "Retry now", Auto-retry in 3/7 days

4. **High Value Alert**:
   - Red background (urgent), "High-value refund detected: $1,245 at risk. Review now?"
   - Primary: "Review Alert", Secondary: "Mark as safe", Auto-dismiss after 1h if no action

5. **Sync Issue**:
   - Yellow background, "Last successful sync was 18 hours ago. Check connection?"
   - Primary: "Try sync now", Secondary: "Check status", Auto-resolves on success

### Specific Notification Types

**Billing Warnings**:
- Sent 3 days before trial end
- Sent when 80%/95% of usage limit reached
- Sent immediately on payment failure
- Sent when subscription updated/changed

**Usage Warnings**:
- In-app banner at 75%, 85%, 95% of limit
- Email at 80% and 95% (more urgent)
- Webhook notification to merchant systems (Enterprise only)

**Failed Payment**:
- Email immediately on failure
- In-app banner persists until resolved
- Automatic retry attempts at 3 and 7 days
- Final notice before cancellation

**Trial Ending**:
- Email sequence: T-3 days, T-1 day, T+0 day, T+1 day
- In-app banner starts at T-3 days
- Dashboard widget countdown
- Feature grace period explanation

**Upgrade Suggestions**:
- Triggered by: feature attempt, usage threshold, time in trial
- Personalized based on merchant behavior
- Shows specific benefit: "Stores like yours save $X/month with Growth plan"
- A/B tested for optimal conversion

## 13 Security

### Merchant Protection
- **Data Minimization**: Only stores encrypted token + essential operational data
- **Purpose Limitation**: Shopify data used solely for refund leak detection
- **Retention Policy**: 
  - Active merchants: Indefinite (with right to delete)
  - Canceled merchants: 90 days grace period, then anonymized
  - Data export available upon request within retention period
- **Access Controls**: 
  - Merchant only accesses own shop data
  - No cross-tenant data visibility
  - Role-based access (if multi-user features added)

### Billing Fraud Prevention
- **Shopify PCI DSS Compliance**: All payment processing handled by Shopify
- **Zero Payment Data Touch**: ReturnPilot never sees credit card numbers
- **Subscription Verification**: Regular checks against Shopify's source of truth
- **Anomaly Detection**: Unusual pattern flagging (sudden plan changes, geographic anomalies)
- **Challenge Flow**: Step-up authentication for high-risk account changes
- **Refund Abuse Limits**: Maximum adjustments/refunds per time period to prevent abuse

### Abuse Prevention
- **Rate Limiting**: 
  - Auth endpoints: Per-IP + per-shop limits
  - API endpoints: Per-shop burst and sustained limits
  - Webhook endpoints: HMAC validation + rate limiting
- **Input Validation**: 
  - All external inputs validated and sanitized
  - Shopify IDs verified format before processing
  - Webhook payloads validated against expected schemas
- **Duplicate Prevention**: 
  - Idempotency keys for all mutating operations
  - Unique constraints prevent duplicate subscription events
  - Webhook deduplication based on Shopify-provided IDs
- **Replay Attack Prevention**: 
  - Nonce/timestamp validation on webhooks
  - Short expiry on state parameters (OAuth)
  - Single-use tokens where applicable

### Webhook Validation
- **HMAC-SHA256**: All incoming webhooks verified before processing
- **Constant-Time Compare**: Prevents timing attacks on signature validation
- **Freshness Check**: Timestamp validation (within 5 minutes) prevents replay
- **HTTP Status Codes**: 
  - 200: Valid webhook processed
  - 401: Invalid/missing signature
  - 400: Malformed payload
  - 500: Internal processing error (logged, Shopify retries)
- **Logging**: All webhook attempts logged for audit (success/failure/reason)

### Permission Model
- **Merchant-Level Isolation**: 
  - All queries scoped by `shop_id` (application level)
  - RLS as defense-in-depth (deny-by-default for anon/authenticated)
  - Service-role key bypasses RLS but all code includes `shop_id` scoping
- **Data Access Patterns**:
  - Reads: Always include `where shop_id = current_shop_id`
  - Writes: Always include `shop_id = current_shop_id` in upsert/insert
  - No cross-shop queries permitted in implementation
- **API Protection**:
  - All route handlers validate merchant session before processing
  - Shared middleware validates `CRON_SECRET` for cron endpoints
  - Public endpoints (webhooks) validated via HMAC only
- **Token Protection**:
  - AES-256-GCM encryption with rotating keys
  - Plaintext tokens never touch logs, disk, or memory dumps
  - Key material restricted to server-only modules
  - Versioned keyring enables rotation without re-encrypting all tokens

### Audit Logging
- **Authentication Events**: 
  - Login attempts (success/failure)
  - Session creation/expiration
  - Permission changes (if multi-user added)
- **Data Access Events**:
  - PHI/PII access (if applicable)
  - Bulk exports (>100 records)
  - Schema changes (via migration tracking)
- **Billing Events**:
  - Subscription changes (plan, status, payment method)
  - Payment attempts (success/failure)
  - Usage threshold crossings
  - Refunds/credits issued
- **Security Events**:
  - Failed HMAC validations (webhook/auth)
  - Rate limit triggers
  - Suspicious login patterns (if auth implemented)
  - Configuration changes (security-related)
- **Log Retention**: 
  - Operational logs: 90 days
  - Security/audit logs: 365 days
  - Immutable storage for compliance requirements
- **Access Controls**: 
  - Logs append-only, no deletion/modification by application
  - Restricted access to security/audit roles
  - Regular integrity checks and tamper detection

## 14 Edge Cases

### Merchant Reinstalls
- **Within 30 days, same plan**: Restore previous settings/preferences if opted-in
- **Within 30 days, different plan**: Start new trial, offer to restore settings
- **>30 days since cancellation**: Treat as new merchant (full 14-day trial)
- **Token still valid**: Skip OAuth, go directly to dashboard with notice
- **Token expired/removed**: Full OAuth flow required
- **Shop renamed during absence**: Detect via Shopify's permanent shop ID, prompt for confirmation

### Duplicate Charge
- **Detection**: Idempotency keys + Shopify webhook deduplication
- **Resolution**: Automatic refund via Shopify Billing API (application_credit)
- **Notification**: Merchant informed of automatic correction
- **Prevention**: Unique constraints on billing events + Shopify subscription ID

### Expired Subscription
- **Grace Period**: 3 days past due date with continued protection
- **Notification Escalation**: 
  - Day 0: Payment failed email + in-app banner
  - Day 3: Urgent warning + reduced functionality notice
  - Day 7: Service suspended + data access notice
- **Recovery**: 
  - Payment restored → immediate full access restoration
  - After suspension → reactivation flow with possible re-verification

### Usage Reset
- **Timing**: Aligns with billing cycle (typically calendar monthly)
- **Process**: Atomic reset at midnight UTC on reset date
- **Forewarning**: Email 3 days before: "Your usage counter will reset on DATE"
- **Partial Period**: First/last period prorated based on actual dates
- **Manual Reset**: Not permitted (would break billing integrity)

### Timezone
- **Storage**: All timestamps in UTC with timezone offset where relevant
- **Display**: 
  - Dashboard: Merchant's timezone (from settings or browser detection)
  - Email: Merchant's timezone (from settings)
  - Reports: UTC for consistency, local for merchant-facing
- **Usage Calculation**: Based on UTC billing period to avoid DST issues
- **Shopify Sync**: Uses Shopify's timestamps (UTC) converted for display
- **Edge Case**: Merchant changes timezone mid-period → usage still based on UTC periods

### Plan Change
- **Upgrade**: 
  - Immediate feature access
  - Prorated charge: (new_price - old_price) * (days_remaining / total_days)
  - Usage limits increase immediately
  - Confirmation shows exact proration amount
- **Downgrade**: 
  - Feature access ends at period end
  - Prorated credit: (old_price - new_price) * (days_remaining / total_days) → next bill
  - Warns of feature loss 7 days, 3 days, 1 day before
  - Usage limits decrease at next period start
- **Same Tier Change** (e.g., monthly to annual): 
  - Handled as renewal with new commitment
  - Proration/reset based on new term

### Failed Payment
- **Retry Logic**: 
  - Attempt 1: Initial failure (triggers notification)
  - Attempt 2: 3 days later (second email + continued grace)
  - Attempt 3: 7 days later (final warning + prep for suspension)
- **Grace Periods**:
  - 0-3 days: Full protection, payment retry pending
  - 3-7 days: Full protection, urgent action needed
  - 7+ days: Service suspended, data preserved for 30 days
- **Recovery Path**: 
  - Update payment method → immediate retry
  - Success → service restoration + notification
  - Failure → continue to next retry attempt
- **Fraud Guard**: 
  - Same card failed 3x in 7 days → temporary block
  - Different card attempted → allowed after verification

### Store Frozen (by Shopify)
- **Detection**: 
  - Failed webhook deliveries (Shopify returns 4xx/5xx)
  - Failed API calls (402 Payment Required, 409 Shop domain frozen)
  - Missing sync data for >5 days despite successful attempts
- **Response**: 
  - Pause protected order counting (no new accrual)
  - Continue to generate alerts from existing cached data (read-only)
  - Clear in-app banner: "Store appears frozen by Shopify. Protection paused."
  - Email notification with steps to resolve with Shopify
- **Recovery**: 
  - Automatic resume when Shopify API calls succeed again
  - Backfill protected orders for downtime period (estimate based on historical)
  - No double-charging for paused period

### Store Transferred (Ownership Change)
- **Detection**: 
  - New OAuth token for same shop domain (different account)
  - Shopify webhook: `shop/update` with owner changes
  - Inconsistent billing data (subscription tied to old owner)
- **Response**: 
  - Pause billing activities pending verification
  - Require re-verification of merchant identity
  - Transfer subscription to new owner with consent
  - Preserve alerts/settings if verified same business entity
  - Treat as new merchant if unrelated party (new trial, clean slate)

## 15 Risks

### Business Risks
1. **Merchant Churn Due to Perceived Low Value**
   - *Mitigation*: Clear ROI demonstration in onboarding, usage-based upgrade paths, regular value reports
   - *Engagement Impact*: High - directly affects revenue
   - *Confidence*: High - solvable through product education and value visibility

2. **Price Sensitivity in SMB Market**
   - *Mitigation*: Tiered pricing with true free tier, demonstrable value preservation > cost
   - *Engagement Impact*: Medium - affects acquisition and expansion
   - *Confidence*: High - validated through competitor analysis and pricing psychology

3. **Competitive Pressure from Bundled Solutions**
   - *Mitigation*: Specialization advantage, superior detection accuracy, transparent pricing
   - *Engagement Impact*: Medium - affects differentiation
   - *Confidence*: Medium - requires continuous superiority demonstration

4. **Economic Downturn Reducing Software Spend**
   - *Mitigation*: Position as essential loss prevention (like insurance), not discretionary spend
   - *Engagement Impact*: High - affects renewal rates
   - *Confidence*: Medium - depends on macroeconomic factors beyond control

### Technical Risks
1. **Shopify API Changes Breaking Detection**
   - *Mitigation*: Versioned API client, monitoring, automated tests against API schema
   - *Engagement Impact*: High - directly affects core functionality
   - *Confidence*: High - solved through engineering practices and vigilance

2. **Billing System Complexity Causing Errors**
   - *Mitigation*: Leverage Shopify's battle-tested billing infrastructure, minimize custom logic
   - *Engagement Impact*: High - affects revenue and trust
   - *Confidence*: High - Shopify Billing API is reliable and well-documented

3. **Data Pipeline Corruption Leading to Inaccurate Alerts**
   - *Mitigation*: Idempotency, validation at edges, reconciliation processes, circuit breakers
   - *Engagement Impact*: High - affects trust and value proposition
   - *Confidence*: High - solved through established data engineering patterns

4. **Infrastructure Outages Causing Missed Protection Windows**
   - *Mitigation*: Multi-region deployment (Vercel), retry mechanisms, graceful degradation
   - *Engagement Impact*: Medium - affects SLAs and trust
   - *Confidence*: High - Vercel platform provides strong resilience

### Financial Risks
1. **Revenue Recognition Complexity**
   - *Mitigation*: Standard SaaS revenue recognition practices, Shopify handles payment complexity
   - *Engagement Impact*: Low - back-office function
   - *Confidence*: High - well-established accounting practices

2. **Chargeback/Fraud Losses**
   - *Mitigation*: Shopify handles payment fraud, clear terms of service, usage monitoring
   - *Engagement Impact*: Low - payment processor liability
   - *Confidence*: High - standard e-commerce protections apply

3. **Underpricing Leading to Unsustainable Unit Economics**
   - *Mitigation*: Rigorous COGS calculation, value-based pricing, regular review
   - *Engagement Impact*: High - affects long-term viability
   - *Confidence*: High - solvable through financial analysis and testing

### Legal Risks
1. **Regulatory Changes Affecting Subscription Models**
   - *Mitigation*: Clear terms, easy cancellation, transparent pricing, legal monitoring
   - *Engagement Impact*: Low - affects compliance overhead
   - *Confidence*: High - standard SaaS compliance approaches apply

2. **Data Privacy Violations (GDPR/CCPA)**
   - *Mitigation*: Data minimization, encryption, consent mechanisms, deletion capabilities
   - *Engagement Impact*: Medium - affects trust and potential fines
   - *Confidence*: High - solvable through privacy-by-design principles

3. **Intellectual Property Disputes**
   - *Mitigation*: Clean room development, no reverse engineering, standard algorithms
   - *Engagement Impact*: Low - affects potential litigation costs
   - *Confidence*: High - based on original development and common techniques

### Merchant Risks
1. **False Sense of Security Leading to Negligence**
   - *Mitigation*: Clear messaging that ReturnPilot is a monitoring tool, not a replacement for controls
   - *Engagement Impact*: Medium - affects merchant behavior
   - *Confidence*: Medium - solvable through education and setting expectations

2. **Alert Fatigue Causing Ignored Notifications**
   - *Mitigation*: Intelligent alerting, suppression rules, priority escalation, feedback loops
   - *Engagement Impact*: Medium - affects value realization
   - *Confidence*: High - solvable through UX and intelligent notification systems

3. **Dependency on Single Platform (Shopify)**
   - *Mitigation*: Shopify's dominant position in market, abstraction layer for potential expansion
   - *Engagement Impact*: Low - affects long-term strategic options
   - *Confidence*: High - Shopify represents >80% of target addressable market

### Support Risks
1. **Scaling Support Demand with Growth**
   - *Mitigation*: Self-serve documentation, community forums, tiered support levels
   - *Engagement Impact*: Medium - affects operating margins
   - *Confidence*: High - solvable through investment in self-serve and automation

2. **Support Quality Degradation**
   - *Mitigation*: Training programs, quality metrics, customer feedback loops
   - *Engagement Impact*: Medium - affects retention and NPS
   - *Confidence*: High - solvable through investment in people and processes

3. **Language/Localization Barriers**
   - *Mitigation*: Initial English-only focus, expansion planned based on demand
   - *Engagement Impact*: Low - affects TAM expansion timing
   - *Confidence*: High - solvable through phased internationalization

## 16 Rollout Plan

### Phase 1: Foundation (Weeks 1-2)
- **Goal**: Establish billing infrastructure and basic subscription management
- **Activities**:
  - Implement Shopify Billing API integration
  - Extend `shops` table with billing fields (plan, status, timestamps)
  - Create basic settings UI for plan viewing (no changes yet)
  - Build webhook handlers for subscription events
  - Create audit logging for billing events
  - Implement usage tracking (protected orders counting)
- **Success Criteria**:
  - Basic subscription creation works via Shopify
  - Usage tracking accurate against manual counts
  - Webhook handlers process events without errors
  - No regression in existing detection/features
- **Stakeholders**: Engineering lead, billing specialist, Shopify expert
- **Dependencies**: Completed database migration (0004_billing_plan.sql)

### Phase 2: Trial & Conversion (Weeks 3-4)
- **Goal**: Implement free trial system and conversion optimization
- **Activities**:
  - 14-day free trial implementation
  - Trial expiration and conversion handling
  - Upgrade/downgrade flows (proration, feature access)
  - Cancellation with grace period and data retention
  - Payment failure handling and retry logic
  - Trial/value-based upgrade prompts in dashboard
- **Success Criteria**:
  - Trial → paid conversion rate > 40%
  - Charg [TRUNCATED]