# LaptopMitra — AI Handoff: Known Issues & Technical Debt

This document outlines confirmed technical debt, migration notes, and operational nuances verified directly against the codebase.

---

## 1. Verified Technical Nuances & Operational Gotchas

### A. Monorepo Build Sequence Requirement (Confirmed)
- **Description**: `apps/web` and `apps/mobile` consume packages (`@laptopmitra/types`, `@laptopmitra/tokens`, `@laptopmitra/api-client`) from their compiled `dist/` folders rather than raw TypeScript files.
- **Impact**: Running `pnpm type-check` or `pnpm build` in `apps/web` or `apps/mobile` without first running `pnpm --filter "@laptopmitra/*" build` will throw module resolution errors.
- **Remediation**: Always execute `pnpm --filter "@laptopmitra/*" build` before running type checks or standalone app builds.

### B. React 19 Ecosystem Nuances in Mobile (Confirmed)
- **Description**: `apps/mobile` uses Expo SDK 57 paired with React `19.2.3` and React Native `0.86.3`. Some community packages historically assumed React 18 type definitions.
- **Impact**: `package.json` relies on explicit dependency pinning and peer dependency overrides to avoid React type collisions.
- **Rule**: Do not arbitrarily downgrade React or update navigation packages without verifying Expo SDK 57 peer-compatibility.

### C. Database Connection Limits on Serverless / Render (Confirmed)
- **Description**: The NestJS API on Render and Prisma Client manage an internal connection pool. In serverless or containerized restart scenarios, exhausting PostgreSQL connections can occur if pool limits are not set.
- **Remediation**: Append `?connection_limit=10&pool_timeout=20` to `DATABASE_URL` in production or route through a connection pooler such as Supabase Pooler (`pgBouncer`) or Neon pooled endpoint.

---

## 2. Historical Context & Migration State

### Legacy PHP Monolith (`public_htmlphp`)
- **Historical Context**: The original LaptopMitra application was a single-server procedural PHP codebase (`public_htmlphp`) using MySQL and session-based authentication.
- **Current Parity State**:
  - **Completed Parity**: Product browsing, customer accounts, cart, Razorpay checkout, GST invoices, and coupon discounts are 100% migrated and modernized.
  - **Modern Upgrades**: Replaced procedural PHP scripts with NestJS TypeScript modules, integrated Firebase Authentication, replaced raw MySQL queries with Prisma ORM, introduced digital device passports with hardware serial numbers, and added automated AES-256-GCM encryption for bank payouts.
  - **Legacy PHP Exclusion**: The legacy `public_htmlphp` directory contains obsolete vendor assets and should not be used for any new feature development.

---

## 3. Potential Security & Performance Considerations

### 1. Payment Encryption Key Rotation
- **Current State**: The `PaymentEncryptionService` uses a single static key defined in `PAYMENT_ENCRYPTION_KEY`.
- **Recommendation for Future**: Implement versioned encryption envelopes (e.g. `v1:<iv>:<tag>:<ciphertext>`) to allow seamless zero-downtime key rotation for stored banking details.

### 2. Multi-Region CDN for Media Assets
- **Current State**: Product variant images are currently fetched from Cloudinary or external HTTPS URLs.
- **Recommendation for Future**: Deploy an image caching edge rule on Cloudflare to minimize egress bandwidth and accelerate mobile catalog browsing.

### 3. Webhook Idempotency Window
- **Current State**: `NotificationDedupeLog` records processed webhooks.
- **Maintenance Note**: Ensure a scheduled retention prune job runs every 30 days to purge webhook logs older than 90 days.
