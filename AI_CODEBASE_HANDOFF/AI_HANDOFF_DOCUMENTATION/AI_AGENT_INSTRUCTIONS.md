# AI Agent Instructions & Operating Manual

> [!IMPORTANT]
> **Mandatory Operating Principle**:
> "Before modifying any code, inspect the relevant existing implementation and its dependencies. Preserve the current architecture and coding conventions. Do not unnecessarily rewrite working modules, introduce duplicate functionality, or assume undocumented behavior. Verify changes against related frontend, backend, database, and API workflows."

---

## 1. System Mission & Architecture Overview

LaptopMitra is an e-commerce, rental, AMC servicing, buyback, and affiliate platform for refurbished enterprise laptops in India.

- **Backend (`apps/api`)**: NestJS 11 + Prisma ORM + PostgreSQL. All data persistence, role guards, tax compliance, financial transactions, and encryption live here.
- **Web Frontend (`apps/web`)**: Next.js 16 (React 19, Tailwind CSS v4, TanStack Query). Mobile-first responsive e-commerce web application with customer portal and admin console.
- **Mobile Application (`apps/mobile`)**: Expo SDK 57 (React Native 0.86, React Navigation 7, Zustand, TanStack Query).
- **Shared Packages (`packages/*`)**: `@laptopmitra/types` (canonical contracts), `@laptopmitra/tokens` (design tokens), `@laptopmitra/api-client` (universal HTTP client).

---

## 2. Hard Stops & Non-Negotiable Engineering Rules

From `rules/01-security-rules.md`, `rules/07-ask-before-doing-this.md`, and `AGENTS.md`:

### You Must Always Ask Explicit Approval Before:
1. **Running database schema migrations or altering tables (`prisma migrate`, `db push`).**
2. **Deleting or truncating database data, files, or cloud storage objects.**
3. **Modifying authentication, authorization, or role-guard logic (`FirebaseAuthGuard`, `RolesGuard`).**
4. **Altering financial, billing, withdrawal, or payment calculation logic (`PaymentService`, `DiscountService`, `TaxService`).**
5. **Force-pushing or rewriting git commit history.**
6. **Installing dependencies with broad network, shell, or filesystem permissions.**

### Mandatory Security & Coding Constraints:
- **Never expose secrets**: Environment variables must never be hardcoded or committed to git.
- **Strict currency representation**: All monetary values are Indian Rupees (₹) as `Decimal(10, 2)`. Never divide or multiply by 100 in database models. Conversions to paise occur strictly at the Razorpay SDK call boundary (`amount * 100`).
- **Row-level locks on balances**: Affiliate earnings reservations and withdrawals must execute inside interactive transactions with row locks to prevent race conditions or double-spending.
- **No Node.js APIs in Mobile**: Never import `fs`, `path`, `crypto`, or `child_process` in `apps/mobile`.

---

## 3. Where Functionality Lives: File Inspection Guide

Before writing or modifying code, inspect these canonical files:

| Feature / Domain | Primary Files to Inspect First |
|---|---|
| **Data Models & Relationships** | `apps/api/prisma/schema.prisma` |
| **Authentication & Tokens** | `apps/api/src/auth/guards/firebase-auth.guard.ts`<br/>`apps/api/src/auth/auth.service.ts`<br/>`apps/web/lib/firebase.ts` |
| **Role Authorization** | `apps/api/src/guards/roles.guard.ts`<br/>`apps/web/components/admin/AdminGuard.tsx` |
| **Orders & Stock Reservation** | `apps/api/src/modules/order/order.service.ts`<br/>`apps/api/src/modules/order/order.controller.ts` |
| **Razorpay Payments & Webhooks**| `apps/api/src/modules/payments/payment.service.ts`<br/>`apps/api/src/modules/payments/payment.controller.ts` |
| **Mitra Affiliates & Payouts** | `apps/api/src/modules/discount/discount.service.ts`<br/>`apps/api/src/common/encryption/payment-encryption.service.ts` |
| **Laptops, AMC & Warranty** | `apps/api/src/modules/service/service.service.ts`<br/>`apps/api/src/modules/service/service.controller.ts` |
| **Support Tickets & Situations**| `apps/api/src/modules/support/support.service.ts`<br/>`apps/web/app/account/tickets/page.tsx` |
| **Shared Contracts & DTOs** | `packages/types/src/index.ts`<br/>`packages/types/src/legal-content.ts` |
| **API Client Interceptors** | `packages/api-client/src/index.ts`<br/>`apps/web/lib/api.ts`<br/>`apps/mobile/src/api/client.ts` |
| **Design System & Tokens** | `packages/tokens/src/colors.ts`<br/>`packages/tokens/src/typography.ts`<br/>`packages/tokens/src/spacing.ts` |

---

## 4. How Frontend & Backend Communicate

1. **Authentication Interceptor**:
   Both `apps/web/lib/api.ts` and `@laptopmitra/api-client` intercept all outbound requests. If a Firebase user session is active, it calls `auth.currentUser.getIdToken()` and injects `Authorization: Bearer <token>`.
2. **Expired Token Auto-Refresh**:
   If an endpoint returns `401 Unauthorized` with `TOKEN_EXPIRED`, the client requests a forced token refresh via `auth.currentUser.getIdToken(true)` and retries the request once automatically.
3. **Data Fetching & Cache Synchronization**:
   Both frontends use TanStack React Query (`useQuery`, `useMutation`). Successful mutations must explicitly invalidate related query keys (e.g. `queryClient.invalidateQueries({ queryKey: ['orders'] })`).

---

## 5. Development & Testing Workflow

Follow this exact loop when making changes:

```bash
# Step 1: If shared types or tokens changed, rebuild them first
pnpm --filter "@laptopmitra/*" build

# Step 2: Implement your changes with the smallest diff possible (Ponytail principle)

# Step 3: Run targeted test suites
pnpm --filter api test
pnpm --filter web test
pnpm --filter mobile test

# Step 4: Verify type safety across all workspaces
pnpm type-check

# Step 5: Run linter to maintain clean code standards
pnpm lint
```
