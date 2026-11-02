# ReturnPilot Engineering Rules

## Architectural Rules

### 1. Read-Only Principle
ReturnPilot is a read-only Shopify app. It never modifies orders, refunds, returns, or any Shopify workflow data.
- Only reads data from Shopify via GraphQL API
- Only writes detection results and settings to own Supabase database
- Never issues mutations to Shopify Admin API

### 2. Single Responsibility Components
Each component has one clear responsibility:
- Web app (Next.js): UI presentation only
- API routes: HTTP endpoints for OAuth, webhooks, sync, digest
- Database: Persistent storage only
- Detection engine: Pure business logic with zero I/O
- Scheduler: Vercel Cron only
- Email: Resend integration only

### 3. Defense-in-Depth Security
Multiple overlapping security controls:
- Application-level tenant scoping (shop_id) on every query
- Database Row Level Security (deny-by-default) as backup
- Encrypted sensitive data at rest
- HMAC verification for all Shopify interactions
- Constant-time comparison for secrets
- Minimal required OAuth scopes
- Server-only execution environment

### 4. Idempotency by Design
All operations designed to be safely retried:
- Sync uses Shopify IDs with UNIQUE constraints for convergent upserts
- Webhook registration handles "already exists" gracefully
- Email delivery tracking prevents duplicate sends
- Detection engine produces deterministic output given same input

### 5. Observable and Monitorable
- Structured logging for key events
- Error tracking without exposing sensitive information
- Clear success/failure metrics for cron jobs
- Database constraints enforce data integrity
- Type safety throughout TypeScript codebase

## Data Handling Rules

### 1. Token Security
- Shopify offline tokens never stored in plaintext
- AES-256-GCM encryption with explicit ciphertext/iv/tag columns
- Versioned keyring supports key rotation
- Tokens only decrypted in memory during use
- Strict separation: encryption key only accessible to server-side code

### 2. Data Minimization
- Store only fields needed for detection and display
- Normalized sync tables contain minimal required fields
- Detection engine ignores irrelevant data (exchanges, unattributed line items when required)
- Money at risk calculated precisely when possible, conservative fallbacks when not

### 3. Immutability Assumptions
- Refund facts treated as immutable (amount, timing, line items)
- Return status changes tracked but treated as updates to same logical return
- reviewAlert() and dismissAlert() update the existing refund_alerts row by changing status and timestamp fields

### 4. Tenant Isolation
- Every database query includes explicit shop_id filter
- Service-role client bypasses RLS but queries still scope by shop_id
- No cross-shop data leakage possible through query layer
- RLS provides defense-in-depth if application scoping fails

### 5. Precision Handling
- Monetary values stored as numeric(12,2) to preserve cents precision
- PostgREST returns numeric values as strings to prevent JS floating-point issues
- Conversion to numbers only for calculation, immediate formatting for display
- Money at risk calculations use proportional allocation when line-item data available

## Development Rules

### 1. Dependency Minimization
- Prefer built-in Node.js utilities over external packages
- Use stdlib crypto for HMAC and AES-GCM
- Use Intl.NumberFormat for currency formatting
- External dependencies only for clear value-add (Next.js, Supabase, Resend, Tailwind)

### 2. Testing Discipline
- Detection engine is pure function → fully unit-testable
- All business logic covered by automated tests
- Tests validate edge cases and error conditions
- TypeScript strict mode enabled for all files
- No tests required for trivial glue code (YAGNI principle)

### 3. Code Organization
- Feature-based grouping in lib/ directory
- Server-only enforcement via "server-only" imports
- Clear separation between data access, business logic, and presentation
- Type definitions colocated with related functionality
- Consistent naming conventions following domain terminology

### 4. Error Handling
- Fail-fast on missing configuration (validated env at startup)
- Generic error messages to users (no information leakage)
- Detailed logging for operational visibility
- Graceful degradation where possible (continue processing other shops on failure)
- Error boundaries in React components where appropriate

### 5. Performance Considerations
- Database queries scoped and indexed appropriately
- Pagination for large result sets
- CLS-friendly image loading
- Minimal client-side JavaScript (Server Components preferred)
- Efficient detection algorithms (O(n) where possible)

## Operational Rules

### 1. Configuration Management
- All configuration via environment variables
- Strict validation of required variables at startup
- No hardcoded values for environment-specific settings
- Separate configs for development/staging/production via environnement

### 2. Deployment Strategy
- Vercel platform for automatic builds and deployments
- Cron jobs configured in Vercel platform
- Database migrations applied manually via Supabase SQL Editor
- Zero-downtime deployments through Vercel's immutable deployments

### 3. Monitoring and Observability
- Structured JSON logging for key operations
- Error tracking without sensitive data exposure
- Success/failure metrics for sync and digest jobs
- Alert counts and money at risk visible in dashboard
- Detailed delivery tracking for email system

### 4. Backup and Recovery
- Supabase provides managed Postgres backups
- Database schema versioned via SQL migrations
- Critical configuration (encryption keys) must be backed up separately
- Service can be restored from scratch with proper environment variables

### 5. Incident Response
- Clear separation between operational errors and security incidents
- Rate limit exceeded: operational issue requiring scaling
- Invalid HMAC: potential security incident requiring investigation
- Database connection failures: infrastructural issue
- Detection logic errors: require immediate attention (may miss real leaks)