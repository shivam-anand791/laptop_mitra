# Security Baseline & Audit Verification Report (Phase 0)

**Branch:** `security/prelaunch-fixes`  
**Date:** 2026-10-04  
**Monorepo Packages:** `apps/api`, `apps/web`, `apps/mobile`, `packages/api-client`, `packages/types`  

---

## 1. Baseline Build, Lint, Typecheck & Test Results

| Workspace / Target | Command | Result | Notes / First Failure Line |
|---|---|---|---|
| `apps/api` | `npm run build` | **PASS** (Exit 0) | NestJS build succeeded |
| `apps/api` | `npx tsc --noEmit` | **PASS** (Exit 0) | TypeScript compilation clean |
| `apps/api` | `npm test` | **PRE-EXISTING FAILURE** (Exit 1) | Jest worker OOM when running full suite in parallel (`Zone Allocation failed - process out of memory`). Individual suites (`firebase.service.spec.ts`, `auth.service.spec.ts`, `order.controller.spec.ts`) pass with 37/37 passing tests. |
| `apps/api` | `npm run lint` | **PRE-EXISTING FAILURE** (Exit 1) | Root eslint config missing package: `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'globals' imported from C:\vloume d\laptopmitra\eslint.config.mjs` |
| `apps/web` | `npm run build` | **PASS** (Exit 0) | Next.js 16.3.4 (Turbopack) build & TypeScript check passed (27 routes static/dynamic) |
| `apps/mobile` | `npm run type-check` | **PASS** (Exit 0) | TypeScript `tsc --noEmit` passed with 0 errors |
| `apps/mobile` | `npm test` | **PRE-EXISTING FAILURE** (Exit 1) | `No tests found, exiting with code 1` (requires `--passWithNoTests`) |

---

## 2. Audit Findings Verification Table (Current Code)

| ID | Finding Description | Status | Current `file:line` | One-Line Evidence |
|---|---|---|---|---|
| **F1** | Passwordless & Unverified Token Issuance on `/auth/login` and `/auth/register` | **CONFIRMED** | [apps/api/src/auth/auth.service.ts:23-125](file:///c:/vloume%20d/laptopmitra/apps/api/src/auth/auth.service.ts#L23-L125), [auth.controller.ts:15-32](file:///c:/vloume%20d/laptopmitra/apps/api/src/auth/auth.controller.ts#L15-L32) | `login()` and `register()` only validate `body.email`, completely ignore password, and mint Firebase custom tokens without verifying an ID token. |
| **F2** | Over-Permissive CORS Origin Fallback with Credentials | **CONFIRMED** | [apps/api/src/main.ts:14-24](file:///c:/vloume%20d/laptopmitra/apps/api/src/main.ts#L14-L24) | Origin callback contains `else { callback(null, true); }` with `credentials: true`, allowing any external origin to read user data. |
| **F3** | Razorpay Order Creation Trusts Client-Sent `amount` and `orderId` Without Ownership / Price Check | **CONFIRMED** | [apps/api/src/modules/payments/payment.controller.ts:21-28](file:///c:/vloume%20d/laptopmitra/apps/api/src/modules/payments/payment.controller.ts#L21-L28), [payment.service.ts:37-61, 80-160](file:///c:/vloume%20d/laptopmitra/apps/api/src/modules/payments/payment.service.ts#L37-L61) | `POST /payments/razorpay/order` passes client `@Body('amount')` and `orderId` to Razorpay with zero user-ownership checks or server price validation; webhook does not verify matching order amounts. |
| **F4** | Missing Standard HTTP Security Headers (Helmet / CSP / HSTS) | **CONFIRMED** | [apps/api/package.json:26-40](file:///c:/vloume%20d/laptopmitra/apps/api/package.json#L26-L40), [apps/api/src/main.ts:8-49](file:///c:/vloume%20d/laptopmitra/apps/api/src/main.ts#L8-L49) | `helmet` is not installed or mounted; API responses lack `X-Content-Type-Options`, `X-Frame-Options`, CSP, and HSTS headers. |
| **F5** | Coupon / Discount Code Validation Lacks Route-Level Rate Limiting & Proxy Configuration | **CONFIRMED** | [apps/api/src/modules/discount/discount.controller.ts:14-23](file:///c:/vloume%20d/laptopmitra/apps/api/src/modules/discount/discount.controller.ts#L14-L23), [app.module.ts:37-42](file:///c:/vloume%20d/laptopmitra/apps/api/src/app.module.ts#L37-L42), [main.ts:8-50](file:///c:/vloume%20d/laptopmitra/apps/api/src/main.ts#L8-L50) | `POST /discount/validate` is `@Public()` with no `@Throttle` decorator (inheriting global 100 req/min); `trust proxy` is not enabled in Express. |
| **F6** | Auth Service Fabricates In-Memory Users & Tokens on Database Errors | **CONFIRMED** | [apps/api/src/auth/auth.service.ts:82-101, 113-115, 166-180, 212-225, 356-373](file:///c:/vloume%20d/laptopmitra/apps/api/src/auth/auth.service.ts#L82-L101) | `catch` blocks in `login`, `register`, `guestLogin`, and `syncUser` synthesize fake user objects (`usr_...`) and tokens instead of failing closed with HTTP 503/500. |

---

## 3. Client Caller Map for Affected Endpoints

### A. Endpoint: `POST /auth/login`
- **Call Sites:**
  - `apps/web/lib/api.ts:95-111` (`api.login(email, password)`)
  - `apps/web/lib/auth-context.tsx:72-75` (`login(email, pass)`)
  - `packages/api-client/src/index.ts:82-87` (`LaptopMitraApiClient.login(email, pass)`)
  - `apps/mobile/src/hooks/useApi.ts:6-15` (`useLogin()`)
  - `apps/mobile/src/providers/AuthProvider.tsx:85-92` (`login(email, password)`)
- **Payload Sent:** `{ email: string, password?: string }`
- **Response Keys Read:** `accessToken` (or fallback `access_token`), `refreshToken`, `user`

### B. Endpoint: `POST /auth/register`
- **Call Sites:**
  - `apps/web/lib/api.ts:130-146` (`api.register(data)`)
  - `apps/web/lib/auth-context.tsx:82-85` (`register(data)`)
  - `packages/api-client/src/index.ts:95-100` (`LaptopMitraApiClient.register(data)`)
  - `apps/mobile/src/hooks/useApi.ts:28-37` (`useRegister()`)
  - `apps/mobile/src/providers/AuthProvider.tsx:105-115` (`register(data)`)
- **Payload Sent:** `{ name?: string, email: string, password?: string, referralCode?: string, phone?: string }`
- **Response Keys Read:** `accessToken` (or fallback `access_token`), `refreshToken`, `user`

### C. Endpoint: `POST /auth/sync`
- **Call Sites:**
  - `apps/web/lib/api.ts:166-175` (`api.syncUser(data)`)
  - `apps/web/lib/auth-context.tsx:54` (called automatically when Firebase client token changes)
- **Payload Sent:** `{ name?: string, phone?: string, referralCode?: string }` with HTTP Header `Authorization: Bearer <firebaseIdToken>`
- **Response Keys Read:** `{ user: User }`

### D. Endpoint: `POST /payments/razorpay/order`
- **Call Sites:**
  - `apps/web/lib/api.ts:354-359` (`api.createRazorpayOrder(amount, orderId)`)
  - `packages/api-client/src/index.ts:246-251` (`LaptopMitraApiClient.createRazorpayOrder(amount, orderId)`)
  - `apps/web/app/checkout/page.tsx:216` (checkout payment initiation)
- **Payload Sent:** `{ amount: number, orderId: string }`
- **Response Keys Read:** `{ id: string, amount: number, currency: string, receipt: string }` (Razorpay order object)

### E. Endpoint: `POST /discount/validate`
- **Call Sites:**
  - `apps/web/lib/api.ts:413-418` (`api.validateDiscount(code, cartTotal)`)
  - `packages/api-client/src/index.ts:346-355` (`LaptopMitraApiClient.validateDiscount(code, cartTotal)`)
  - `apps/mobile/src/hooks/useApi.ts:397-406` (`useValidateDiscount()`)
  - `apps/web/app/checkout/page.tsx:112` (coupon application)
- **Payload Sent:** `{ code: string, cartTotal: number }`
- **Response Keys Read:** `{ valid: boolean, discountType: string, discountValue: number, discountAmount: number, message: string }`

---

## 4. Unknowns / Blockers
- **None.** All findings have been confirmed in current source code with exact line references, and all client call sites across Web, Mobile, and API Client packages have been mapped.
