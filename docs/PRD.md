# ReturnPilot Product Requirements Document

## Overview
ReturnPilot is a read-only Shopify app that detects refunds issued without a confirmed received return on Shopify — before the money is gone. It ingests refunds and returns, flags refunds that went out without a confirmed, received return, and emails a short daily digest of the dollars at risk.

## Core Problem Solved
ReturnPilot solves exactly one problem: merchants issuing refunds for products that were never actually returned (and reconciling refunds vs. returns by hand).

## Key Features

### 1. Shopify Integration
- Read-only access to Shopify store data via OAuth
- Requests only `read_orders,read_returns` scopes
- Securely stores encrypted offline access tokens using AES-256-GCM
- Registers mandatory webhooks (`app/uninstalled`, `refunds/create`) and GDPR webhooks
- Syncs hourly via Vercel Cron to pull recent refunds and returns

### 2. Detection Engine
- Pure TypeScript detection engine (no I/O, fully unit-testable)
- For each refund, matches refunded line items against order returns
- Flags refunds when ANY of these conditions hold:
  - **NO_RETURN**: No return record exists for the order (after grace period)
  - **RETURN_NOT_RECEIVED**: Return exists but goods aren't confirmed back (processedQuantity = 0)
  - **QUANTITY_SHORTFALL**: Refunded quantity exceeds processed/received return quantity
- Calculates money at risk proportionally when line-item attribution is available
- If shopifyLineItemId is null, the detection engine skips that refund line item.

### 3. Dashboard
- Server-rendered React dashboard (Next.js App Router)
- Displays refund alerts in a sortable, filterable table
- Shows key information: Order, Refund ID, Reason, Money At Risk, Detected At, Status
- Expandable rows show detailed alert information
- URL-driven pagination, filtering, and sorting
- Summary cards showing counts of open/reviewed/dismissed alerts and total money at risk

### 4. Settings
- Configurable notification email address
- Toggle to enable/disable alert emails
- Settings stored per shop in Supabase

### 5. Email Digest
- Daily email digest via Resend
- Includes all new alerts since last digest
- Shows order, refund ID, reason, money at risk, and detection timestamp
- Formatted tables in both HTML and plain text versions
- Tracks delivery attempts and windows for idempotency

### 6. Security
- Server-only database access using Supabase service-role key (bypasses RLS)
- Row Level Security enabled on all tables with deny-by-default posture
- Tenant isolation enforced by scoping all queries to shop_id in application code
- Encrypted token storage (AES-256-GCM) with versioned keyring support
- HMAC verification for Shopify webhooks and OAuth
- Constant-time comparison for secrets to prevent timing attacks
- Rate limiting on OAuth routes (per-instance fixed window)

### 7. Infrastructure
- Built with Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4 for styling
- Supabase Postgres database
- Vercel for hosting and cron jobs
- Resend for email delivery

## Data Model

### Shops Table
- Encrypted Shopify access token stored as AES-256-GCM ciphertext + iv + tag
- Tracks installation/uninstallation timestamps
- Sync cursor for incremental syncs

### Settings Table
- Notification email address
- Alerts enabled flag

### Refund Alerts Table (Detection Output)
- Stores detected refund leaks
- Tracks alert status (open/reviewed/dismissed)
- Records money at risk and reason for each alert

### Sync Tables (Detection Input)
- Normalized Shopify refund and return data
- Idempotent upserts using Shopify IDs as keys
- Line items processed for accurate matching

## Non-Goals (Explicitly Not in V1)
- Customer return portal
- Shipping labels
- Carrier integrations
- Exchanges
- Inventory management
- Analytics dashboards
- Mobile app
- Multi-user teams
- Accounting/invoices

## Technical Constraints
- 60-day order window limitation (Shopify API restriction without `read_all_orders`)
- Grace period configuration for NO_RETURN detection
- Deterministic alert ordering for consistent email rendering
- Single Shopify client for all Admin API traffic
- Service-role client for all database access (no public Data API surface)

## User Experience
- Simple setup: connect Shopify store via OAuth
- Automatic hourly sync and daily digest
- Clear dashboard showing money at risk
- Actionable alerts with review/dismiss workflow
- Minimal configuration required (just email and alert preferences)