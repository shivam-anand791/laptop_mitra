# Comprehensive Bug & Anomaly Report
**Date:** October 27, 2026  
**Repository:** [Laptop Mitra](file:///c:/vloume%20d/laptopmitra)  
**Task Scope:** Feature Restoration, Admin Panel Restoration (Stage A), and Craft Improvement (Stage B)  
**Status:** REPORT ONLY (No fixes applied in this step)

---

## 1. Summary Table

| ID | Title | Platform / Area | Severity | Status |
| :--- | :--- | :--- | :--- | :--- |
| **B-01** | Supabase Connection Pool Exhaustion `EMAXCONNSESSION` in Session Mode (Port 5432) | Database / API | **Blocker** | Worked around / Open |
| **B-02** | API Server Port Conflict `EADDRINUSE: 0.0.0.0:3001` on Restart | API | **Medium** | Fixed / Resolved |
| **B-03** | MailService Fallback Mode Due to Missing SMTP / Resend Credentials | Email / API | **High** | Open |
| **B-04** | Normalization `TypeError: (o.items \|\| []).map is not a function` in `order.service.ts` | API | **High** | Fixed |
| **B-05** | Missing Honeypot Field `website` in Shared `CreateCorporateInquiryDto` | Shared Packages / Web | **Medium** | Fixed |
| **B-06** | Missing Compiled Module `@laptopmitra/types` in Standalone Node Scripts | Shared Packages / API | **Medium** | Fixed / Resolved |
| **B-07** | ESLint Failure on Unescaped Entity in `app/account/referral/page.tsx` | Web Storefront | **Low** | Fixed |
| **B-08** | TypeScript Shorthand Property Error `totalItems` in `admin/orders/page.tsx` | Web Admin | **Medium** | Fixed |
| **B-09** | TypeScript Breadcrumb Array Type Mismatch in `admin/layout.tsx` | Web Admin | **Low** | Fixed |
| **B-10** | TypeScript Union Property Access on Chart Tooltips in `analytics` & `admin` | Web Admin | **Low** | Fixed |
| **B-11** | AdminGuard Skeleton Renders Dark Classes (`dark:bg-gray-900`) in Light-Only Admin | Web Admin | **Low** | Open |
| **B-12** | Zero Corporate Inquiries Displayed in Admin Queue After Frontend Submission | Web Storefront / Admin | **High** | Open / Unverified |
| **B-13** | Admin 401 Mid-Test Redirect Loop When Browsing Direct URL in Headless Browser | Web Admin / API | **Medium** | Worked around |
| **B-14** | Mobile Layout Horizontal Scrollbar / Table Overflow on `admin/products` at 390px | Web Admin | **Low** | Open |

---

## 2. Detailed Bug Entries

### B-01: Supabase Connection Pool Exhaustion `EMAXCONNSESSION` in Session Mode (Port 5432)
1. **Platform and area**: Database / API
2. **Where**: [apps/api/prisma/prisma.service.ts](file:///c:/vloume%20d/laptopmitra/apps/api/src/prisma/prisma.service.ts), [apps/api/.env](file:///c:/vloume%20d/laptopmitra/apps/api/.env), Supabase pooler host (`aws-0-ap-northeast-2.pooler.supabase.com:5432`).
3. **Steps to reproduce**:
   1. Start NestJS API server (`npm run start:dev`).
   2. Open multiple browser tabs navigating rapidly across Admin pages (`/admin`, `/admin/orders`, `/admin/affiliates`, `/admin/analytics`).
   3. Concurrently execute Jest test suite or standalone script (`pnpm --filter api test`).
   4. Supabase rejects additional connections with HTTP 500 / Service Unavailable.
4. **Expected vs actual behavior**:
   - *Expected*: Database connection pool handles concurrent requests smoothly without crashing or dropping queries.
   - *Actual*: Connections exceed the 15-session ceiling of Supabase's IPv4 port 5432 session pooler; API throws `FATAL: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15`.
5. **Evidence**:
   - `task-1986.log`: `[PrismaService] Database connection deferred/unavailable at startup: Error querying the database: FATAL: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15`.
   - `task-2001.log` (lines 2985, 3004, 3214, 3223, 3543, 3552, 4379, 4388): Repeated `PrismaClientUnknownRequestError: Error querying the database: FATAL: (EMAXCONNSESSION)`.
6. **Severity**: **Blocker** (Cannot ship to production under live concurrent traffic without pool exhaustion).
7. **Root cause**: Confirmed. `DATABASE_URL` connects to port 5432 (Session mode) on Supabase connection pooler rather than port 6543 (Transaction mode / PgBouncer pooler), with an artificially low hard cap of 15 connections shared across all local processes and servers.
8. **Status**: Worked around (configured `?connection_limit=5&pool_timeout=20` in `apps/api/.env` and avoided concurrent standalone Prisma instances), but fundamentally **Open** until database URL is pointed to transaction pooler (port 6543) or connection limit upgraded.
9. **Introduced by our changes or pre-existing?**: Pre-existing in repo `.env` configuration.
10. **Related feature or phase**: Core Database Infrastructure.

---

### B-02: API Server Port Conflict `EADDRINUSE: 0.0.0.0:3001` on Server Restart
1. **Platform and area**: API
2. **Where**: [apps/api/src/main.ts](file:///c:/vloume%20d/laptopmitra/apps/api/src/main.ts), port `3001`.
3. **Steps to reproduce**:
   1. Start API daemon in background (`pnpm --filter api start:dev`).
   2. Execute another startup command or automated restart without killing the existing PID.
   3. Node.js throws unhandled exception.
4. **Expected vs actual behavior**:
   - *Expected*: Graceful process shutdown or port release before binding.
   - *Actual*: Server crashes with fatal `EADDRINUSE` error.
5. **Evidence**:
   - `task-1986.log`: `Error: listen EADDRINUSE: address already in use 0.0.0.0:3001 at Server.setupListenHandle [as _listen2] (node:net:2324:16)`.
6. **Severity**: **Medium** (Developer experience and automated restart risk).
7. **Root cause**: Confirmed. Windows background process holds port 3001 when launched asynchronously.
8. **Status**: Fixed / Resolved (retained active process PID instead of spawning duplicate daemons).
9. **Introduced by our changes or pre-existing?**: Pre-existing runtime management behavior.
10. **Related feature or phase**: Local Development Environment.

---

### B-03: MailService Startup Warning / Fallback Due to Missing SMTP / Resend Credentials
1. **Platform and area**: Email / API
2. **Where**: [apps/api/src/modules/mail/mail.service.ts](file:///c:/vloume%20d/laptopmitra/apps/api/src/modules/mail/mail.service.ts), [apps/api/.env](file:///c:/vloume%20d/laptopmitra/apps/api/.env).
3. **Steps to reproduce**:
   1. Boot API server with existing `.env`.
   2. Inspect startup logs.
4. **Expected vs actual behavior**:
   - *Expected*: Outgoing emails sent via production SMTP or transactional email provider.
   - *Actual*: MailService operates in STDOUT fallback mode; outgoing emails are logged to console only.
5. **Evidence**:
   - `task-1986.log` & `task-2001.log`: `[MailService] WARNING: No active email transport configured! Neither RESEND_API_KEY nor SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are set. Operating in STDOUT fallback mode: outgoing emails will be logged to console only.`
6. **Severity**: **High** (Feature broken in production: customers cannot receive order confirmations, corporate inquiry notifications, or password reset emails).
7. **Root cause**: Confirmed. Neither `RESEND_API_KEY` nor valid `SMTP_HOST` credentials exist in environment variables.
8. **Status**: **Open** (Intentional fallback for local development, but blocker for production launch).
9. **Introduced by our changes or pre-existing?**: Pre-existing in repository template.
10. **Related feature or phase**: Email Service / Phase 4.2 / Phase 5.1.

---

### B-04: Normalization `TypeError: (o.items || []).map is not a function` in `order.service.ts`
1. **Platform and area**: API
2. **Where**: [apps/api/src/modules/order/order.service.ts:75](file:///c:/vloume%20d/laptopmitra/apps/api/src/modules/order/order.service.ts#L75).
3. **Steps to reproduce**:
   1. Run Jest test suite `test/order/lease-and-cart-commercial.spec.ts`.
   2. `createOrder` calls `this.normalizeOrder(order)` on a newly inserted order record where `o.items` is not an iterable array (e.g. relation not eagerly included).
4. **Expected vs actual behavior**:
   - *Expected*: Safely guard item mapping with `Array.isArray(o.items)`.
   - *Actual*: Threw `TypeError: (o.items || []).map is not a function`.
5. **Evidence**:
   - `task-992.log`:
     ```text
     FAIL test/order/lease-and-cart-commercial.spec.ts
     TypeError: (o.items || []).map is not a function
       at OrderService.normalizeOrder (src/modules/order/order.service.ts:75:48)
       at OrderService.createOrder (src/modules/order/order.service.ts:379:17)
     ```
6. **Severity**: **High** (Breaks order creation whenever order items relation is nullish or non-array).
7. **Root cause**: Confirmed. Unsafe assumption that `o.items` was always an iterable array rather than verifying `Array.isArray(o.items)`.
8. **Status**: **Fixed** in `apps/api/src/modules/order/order.service.ts` in task-1003 (test passed 100%).
9. **Introduced by our changes or pre-existing?**: Pre-existing order normalization logic exposed during Phase R3 commercial integrity tests.
10. **Related feature or phase**: Phase R3 (Commercial Integrity & Lease Advance).

---

### B-05: Missing Honeypot Field `website` in Shared `CreateCorporateInquiryDto`
1. **Platform and area**: Shared Packages / Web Storefront
2. **Where**: [packages/types/src/index.ts](file:///c:/vloume%20d/laptopmitra/packages/types/src/index.ts), [apps/web/components/CorporateQuoteModal.tsx:97](file:///c:/vloume%20d/laptopmitra/apps/web/components/CorporateQuoteModal.tsx#L97).
3. **Steps to reproduce**:
   1. In `CorporateQuoteModal.tsx`, anti-spam honeypot input passes `website: ''` to `api.createCorporateInquiry(dto)`.
   2. Run `pnpm --filter web type-check`.
4. **Expected vs actual behavior**:
   - *Expected*: Shared DTO interface permits optional honeypot field `website?: string`.
   - *Actual*: TypeScript threw `error TS2353: Object literal may only specify known properties, and 'website' does not exist in type 'CreateCorporateInquiryDto'`.
5. **Evidence**:
   - `task-279.log`: `components/CorporateQuoteModal.tsx(97,9): error TS2353: Object literal may only specify known properties, and 'website' does not exist in type 'CreateCorporateInquiryDto'`.
6. **Severity**: **Medium** (Build failure).
7. **Root cause**: Confirmed. Type contract divergence between backend bot protection and shared package DTO.
8. **Status**: **Fixed** by declaring `website?: string` in `CreateCorporateInquiryDto` inside `packages/types/src/index.ts` and recompiling package.
9. **Introduced by our changes or pre-existing?**: Introduced during anti-spam honeypot implementation.
10. **Related feature or phase**: Phase 4.2 (Corporate Quote Modal & Anti-Spam).

---

### B-06: Missing Compiled Module `@laptopmitra/types` in Standalone Node Scripts
1. **Platform and area**: Shared Packages / API
2. **Where**: [apps/api/scripts/test-payout-concurrency.ts](file:///c:/vloume%20d/laptopmitra/apps/api/scripts/test-payout-concurrency.ts).
3. **Steps to reproduce**:
   1. Execute `npx ts-node scripts/test-payout-concurrency.ts` without pre-building packages.
4. **Expected vs actual behavior**:
   - *Expected*: Workspace packages resolve seamlessly.
   - *Actual*: Script crashed immediately with `Error: Cannot find module '@laptopmitra/types'`.
5. **Evidence**:
   - `task-582.log` & `task-923.log`: `Error: Cannot find module '@laptopmitra/types'`.
6. **Severity**: **Medium** (Developer workflow / script execution failure).
7. **Root cause**: Confirmed. `@laptopmitra/types` package.json points to `dist/index.js`, which was uncompiled.
8. **Status**: **Fixed / Resolved** by running `pnpm --filter "@laptopmitra/*" build` prior to script execution.
9. **Introduced by our changes or pre-existing?**: Pre-existing monorepo build requirement.
10. **Related feature or phase**: Monorepo Tooling / Phase 5.1.

---

### B-07: ESLint Failure on Unescaped Entity in `app/account/referral/page.tsx`
1. **Platform and area**: Web Storefront
2. **Where**: [apps/web/app/account/referral/page.tsx:214](file:///c:/vloume%20d/laptopmitra/apps/web/app/account/referral/page.tsx#L214).
3. **Steps to reproduce**:
   1. Run `pnpm --filter web lint`.
4. **Expected vs actual behavior**:
   - *Expected*: Zero lint warnings/errors.
   - *Actual*: ESLint failed with `react/no-unescaped-entities` on literal `'` inside JSX.
5. **Evidence**:
   - `task-2259.log`: `214:31  error  `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`  react/no-unescaped-entities`.
6. **Severity**: **Low** (CI / linter failure).
7. **Root cause**: Confirmed. Raw apostrophe in text: `"You haven't referred anyone yet"`.
8. **Status**: **Fixed** by replacing `'` with `&apos;`.
9. **Introduced by our changes or pre-existing?**: Introduced in referral screen revisions.
10. **Related feature or phase**: Customer Affiliate Dashboard.

---

### B-08: TypeScript Shorthand Property Error `totalItems` in `admin/orders/page.tsx`
1. **Platform and area**: Web Admin
2. **Where**: [apps/web/app/admin/orders/page.tsx:142](file:///c:/vloume%20d/laptopmitra/apps/web/app/admin/orders/page.tsx#L142).
3. **Steps to reproduce**:
   1. Pass `{ totalItems }` shorthand to `DataTable` pagination props when the state variable was named `totalOrders`.
   2. Run `pnpm --filter web type-check`.
4. **Expected vs actual behavior**:
   - *Expected*: Compiles cleanly.
   - *Actual*: Threw `TS18004: No value exists in scope for shorthand property 'totalItems'`.
5. **Evidence**:
   - `task-2254.log` / terminal output.
6. **Severity**: **Medium** (Build failure).
7. **Root cause**: Confirmed. Variable naming mismatch.
8. **Status**: **Fixed** by changing property to `totalItems: totalOrders`.
9. **Introduced by our changes or pre-existing?**: Introduced during Stage B component migration.
10. **Related feature or phase**: Stage B Admin Orders Refactor.

---

### B-09: TypeScript Breadcrumb Array Type Mismatch in `admin/layout.tsx`
1. **Platform and area**: Web Admin
2. **Where**: [apps/web/app/admin/layout.tsx:90](file:///c:/vloume%20d/laptopmitra/apps/web/app/admin/layout.tsx#L90).
3. **Steps to reproduce**:
   1. Initialize `crumbs` array with an object having `href: '/admin'`, then push `{ label: 'Dashboard' }` without `href`.
   2. Run `pnpm --filter web type-check`.
4. **Expected vs actual behavior**:
   - *Expected*: Inferred optional `href?: string`.
   - *Actual*: TypeScript inferred `href` as strictly required, throwing `TS2345`.
5. **Evidence**:
   - `task-2254.log` / terminal output.
6. **Severity**: **Low** (Build failure).
7. **Root cause**: Confirmed. Implicit array type inference.
8. **Status**: **Fixed** by explicitly typing `const crumbs: { label: string; href?: string }[]`.
9. **Introduced by our changes or pre-existing?**: Introduced during Stage B breadcrumb implementation.
10. **Related feature or phase**: Stage B Shell Refactor.

---

### B-10: TypeScript Union Property Access on Chart Tooltips in `analytics` & `admin`
1. **Platform and area**: Web Admin
2. **Where**: [apps/web/app/admin/analytics/page.tsx:285](file:///c:/vloume%20d/laptopmitra/apps/web/app/admin/analytics/page.tsx#L285), [apps/web/app/admin/page.tsx:294](file:///c:/vloume%20d/laptopmitra/apps/web/app/admin/page.tsx#L294).
3. **Steps to reproduce**:
   1. SVG timeline chart unioned revenue points (`{ date, amount }`) and order points (`{ date, count }`).
   2. Index into `activePoints[hoveredIdx].amount`.
   3. Run `pnpm --filter web type-check`.
4. **Expected vs actual behavior**:
   - *Expected*: Compiles cleanly.
   - *Actual*: Threw `TS2339: Property 'amount' does not exist on type '{ date: string; amount: number } | { date: string; count: number }'`.
5. **Evidence**:
   - `task-2254.log` / terminal output.
6. **Severity**: **Low** (Build failure).
7. **Root cause**: Confirmed. Union property access without type guard.
8. **Status**: **Fixed** by safely coercing accessor to `(activePoints[hoveredIdx] as any).amount || 0`.
9. **Introduced by our changes or pre-existing?**: Introduced during Stage B timeline chart implementation.
10. **Related feature or phase**: Stage B Timeline Chart.

---

### B-11: AdminGuard Skeleton Renders Dark Classes (`dark:bg-gray-900`) in Light-Only Admin
1. **Platform and area**: Web Admin
2. **Where**: [apps/web/components/admin/AdminGuard.tsx:77-88](file:///c:/vloume%20d/laptopmitra/apps/web/components/admin/AdminGuard.tsx#L77-L88).
3. **Steps to reproduce**:
   1. Set operating system or browser preference to Dark Mode.
   2. Open browser and navigate to `http://localhost:3000/admin`.
   3. Observe the initial authentication resolution skeleton while `authLoading || isVerifying` is true.
4. **Expected vs actual behavior**:
   - *Expected*: Skeleton renders pure light tokens (`bg-slate-50`, `bg-white`, `border-slate-200`) without any dark mode classes, adhering to the mandatory Light-Only Admin rule.
   - *Actual*: Skeleton displays dark background (`dark:bg-gray-900`) and dark aside (`dark:bg-gray-800`), causing a momentary visual dark flash before loading the pure light dashboard.
5. **Evidence**:
   - Source code in `apps/web/components/admin/AdminGuard.tsx`:
     ```tsx
     <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col lg:flex-row">
       <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 space-y-6 hidden lg:block animate-pulse">
     ```
6. **Severity**: **Low** (Cosmetic flash during session resolution).
7. **Root cause**: Confirmed. Lingering legacy dark mode utility classes in `AdminGuard.tsx`.
8. **Status**: **Open** (Not yet edited, preserving report-only constraint).
9. **Introduced by our changes or pre-existing?**: Pre-existing in `AdminGuard.tsx`.
10. **Related feature or phase**: Admin Authentication Shell.

---

### B-12: Zero Corporate Inquiries Displayed in Admin Queue After Frontend Submission
1. **Platform and area**: Web Storefront / Web Admin / API
2. **Where**: `http://localhost:3000/admin/inquiries`, [apps/web/components/CorporateQuoteModal.tsx](file:///c:/vloume%20d/laptopmitra/apps/web/components/CorporateQuoteModal.tsx), [apps/api/src/modules/support/support.service.ts](file:///c:/vloume%20d/laptopmitra/apps/api/src/modules/support/support.service.ts).
3. **Steps to reproduce**:
   1. In web storefront (`http://localhost:3000`), open "Request Corporate Quote" modal.
   2. Enter organization name, contact details, quantity, and tenure, then click Submit.
   3. Open Admin Portal and navigate to `http://localhost:3000/admin/inquiries`.
4. **Expected vs actual behavior**:
   - *Expected*: Submitted quote request persists to database and appears immediately in the Admin Inquiries DataTable.
   - *Actual*: Browser subagent reported `Attempted/inspected the table (0 corporate inquiries found)`.
5. **Evidence**:
   - `scratchpad_q9bdyzj7.md`: `- [x] 4. Click on the first "Update" button in the table to open AdminModal ... 0 corporate inquiries found`.
   - `task-2323` subagent report.
6. **Severity**: **High** (Commercial risk: incoming corporate procurement and leasing inquiries might not reach the administrative sales queue).
7. **Root cause**: Suspected. When browser subagent tested the form, either the frontend request failed client-side validation (phone number length, required fields) before dispatching the POST request, or backend honeypot check/DB connection pool rejected the write.
8. **Status**: **Open / Unverified** (Requires verifying the end-to-end form POST network payload against the live database).
9. **Introduced by our changes or pre-existing?**: Pre-existing / newly integrated quote workflow.
10. **Related feature or phase**: Phase 4.2 Corporate Inquiries.

---

### B-13: Admin 401 Mid-Test Redirect Loop When Browsing Direct URL in Headless Browser
1. **Platform and area**: Web Admin / API
2. **Where**: [apps/web/lib/api.ts:99-106](file:///c:/vloume%20d/laptopmitra/apps/web/lib/api.ts#L99-L106), `http://localhost:3000/admin/*`.
3. **Steps to reproduce**:
   1. Direct fetch to `/admin/*` without an initialized Firebase auth cookie/token.
   2. API returns 401.
   3. Next.js triggers full window redirect to `/login?next=/admin`.
4. **Expected vs actual behavior**:
   - *Expected*: Smooth session handling and clear unauthenticated screen.
   - *Actual*: Abrupt page reload and redirection to `/login` during automated testing.
5. **Evidence**:
   - `apps/web/lib/api.ts`:
     ```ts
     if (res.status === 401) {
       const isAdminContext = endpoint.startsWith('/admin') || (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));
       if (isAdminContext && typeof window !== 'undefined') {
         window.location.href = '/login?next=/admin';
       }
     }
     ```
6. **Severity**: **Medium** (Automated browser testing and headless session stability).
7. **Root cause**: Confirmed. Hard window redirect on any 401 response without checking if token refresh is already pending.
8. **Status**: **Worked around** (ensured persistent admin session in browser profile).
9. **Introduced by our changes or pre-existing?**: Pre-existing auth interceptor logic.
10. **Related feature or phase**: Admin Session Management.

---

### B-14: Mobile Layout Horizontal Scrollbar / Table Overflow on `admin/products` at 390px
1. **Platform and area**: Web Admin
2. **Where**: [apps/web/app/admin/products/page.tsx](file:///c:/vloume%20d/laptopmitra/apps/web/app/admin/products/page.tsx), `http://localhost:3000/admin/products`.
3. **Steps to reproduce**:
   1. Resize browser viewport to 390px width.
   2. Navigate to `http://localhost:3000/admin/products`.
4. **Expected vs actual behavior**:
   - *Expected*: Catalog controls and product table adapt to mobile viewport without page-level horizontal overflow.
   - *Actual*: Catalog table headers and action buttons extend past 390px, causing page-level horizontal scrollbar.
5. **Evidence**:
   - `stage_b_products_390_1793089962289.png`: Table extends past the right screen boundary on 390px mobile view.
6. **Severity**: **Low** (Cosmetic / mobile responsiveness on admin products catalog).
7. **Root cause**: Confirmed. `apps/web/app/admin/products/page.tsx` was untouched during Stage B (preserving non-regression constraints) and has not yet been migrated to the new responsive `DataTable` component.
8. **Status**: **Open** (Preserved as untouched).
9. **Introduced by our changes or pre-existing?**: Pre-existing in original branch.
10. **Related feature or phase**: Admin Products Management.

---

## 3. Items That Could Not Be Tested & Why

1. **Real SMTP / Outgoing Email Delivery**:
   - *Reason*: No live Resend API key (`RESEND_API_KEY`) or SMTP server credentials (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) are configured. Mail service runs strictly in stdout console fallback mode (`MAIL_DRIVER=console`).
2. **Physical Native Mobile App Execution (iOS / Android)**:
   - *Reason*: No physical iOS/Android device or running emulator was attached in this environment. Tested via TypeScript type checking (`tsc --noEmit` passing across `apps/mobile`) and configuration audits, but not Hermes runtime execution.
3. **Live Razorpay Payment Capture & Webhook Processing**:
   - *Reason*: Razorpay test credentials (`rzp_test_TqqjytnhcVMZgl`) are sandbox keys. Real bank card transactions and automated bank transfers (payout IMPS/NEFT via RazorpayX) cannot be tested with real capital.
4. **Cloud Storage / S3 / Supabase Storage File Uploads for Payout QRs**:
   - *Reason*: AWS S3 or Supabase Storage credentials are dummy placeholders (`fake_s3_bucket`, `s3.ap-south-1.amazonaws.com`). QR code image verification is currently handled via in-memory magic bytes and local base64/buffer verification rather than real S3 bucket uploads.
5. **High-Concurrency DB Stress (>15 concurrent connections)**:
   - *Reason*: Remote Supabase connection pool is strictly capped at `pool_size: 15`. Simulating >15 concurrent users against the remote DB triggers fatal Supabase pooler rejection (`EMAXCONNSESSION`).

---

## 4. Tests Skipped, Weakened, Mocked, or Changed

1. **`apps/api/test/cart/cart-service.spec.ts`**:
   - Used mocked Prisma service rather than live PostgreSQL database to prevent exhausting the remote Supabase 15-connection limit during unit test execution.
2. **`apps/api/test/discount/payout-and-withdrawals.spec.ts`**:
   - Mocked `AuditLog` creation and `PaymentEncryptionService` key validation in unit tests; full live PostgreSQL concurrency verification was conducted separately via standalone script `test-payout-concurrency.ts`.
3. **`apps/api/test/support/corporate-inquiry.spec.ts`**:
   - In-memory fallback and mocked Prisma were utilized for ticket messaging tests to avoid remote database latency and pool saturation.

---

## 5. Environment Problems Encountered

1. **Remote Supabase PostgreSQL Pool Exhaustion (`EMAXCONNSESSION`)**:
   - *Impact*: When both the Next.js frontend dev server, the NestJS API server, and automated test runners were active concurrently, database queries failed with `FATAL: max clients reached in session mode`. This caused intermittent `500 Backend Service Error` responses on web admin pages until pool timeout and connection limits were capped to 5 in `DATABASE_URL`.
2. **API Server Port 3001 Binding Lock (`EADDRINUSE`)**:
   - *Impact*: Starting a new NestJS instance in the background while an existing one was already active caused startup crash. Solved by retaining the existing active process.
3. **Monorepo Package Compilation Dependency**:
   - *Impact*: Standalone TypeScript files in `apps/api` failed to import `@laptopmitra/types` because packages must be compiled to `./dist` via Turborepo before raw Node/ts-node can resolve them.

---

## 6. Inconsistencies Between Earlier Reports & Actual Observations

1. **Corporate Inquiry Table Inconsistency**:
   - *Earlier Subagent Claim*: In step 2287, the subagent reported that it "Tested the Request Corporate Quote & Leasing flow, filling out organization details, quantities, and deployment specifications".
   - *Actual Observation*: In step 2323, when navigating to `/admin/inquiries`, 0 corporate inquiries were found in the database table (`scratchpad_q9bdyzj7.md`). Either the quote form was not actually submitted or the submission failed validation silently.
2. **Admin Authentication Assumption**:
   - *Earlier Assumption*: Admin panel would immediately redirect to `/login?next=/admin` if accessed directly.
   - *Actual Observation*: The browser session in local Chrome already contained a valid authenticated admin profile, allowing direct access without prompting for login credentials (`scratchpad_umxonwi0.md`).

---

## 7. Items That Looked Wrong But Were Not Investigated

1. **`AdminGuard.tsx` Skeleton Dark Theme Classes**:
   - Observed that `AdminGuard.tsx` lines 77-88 still contain `dark:bg-gray-900` and `dark:bg-gray-800` during the loading state, which briefly flashes on screens when the OS is in dark mode. Not fixed yet as prompt rules restrict changes.
2. **Zero Order History in Admin Analytics Timeline**:
   - Analytics timeline chart rendered 0 order history line points because there was only 1 test order in the remote database. The SVG correctly drew flat lines, but visual validation with rich multi-day data points relied on simulated range props.
3. **Customer Mobile Payout Settings Integration**:
   - Mobile screen `apps/mobile/src/screens/main/AccountScreen.tsx` was inspected for affiliate link display, but end-to-end Expo UI testing on an Android device for customer payout settings was not performed in this session.

---

## 8. Final Counts & Top 5 Launch Risks

### Counts
- **Total Bugs / Issues Identified**: 14
- **Fixed**: 7 (B-04, B-05, B-06, B-07, B-08, B-09, B-10)
- **Worked Around**: 2 (B-01, B-02, B-13)
- **Open**: 4 (B-01 real pooler upgrade, B-03, B-11, B-12, B-14)
- **Unverified**: 2 (B-12 quote submission end-to-end pipeline, B-14 mobile products catalog table)

### Top 5 Launch Risks in Priority Order
1. **Supabase Database Pool Saturation (`EMAXCONNSESSION`) (B-01)**: Running on Supabase port 5432 in session mode with a 15-connection limit will drop customer checkout and admin sessions under production launch traffic. Must switch to Transaction mode (port 6543) or dedicated PgBouncer pooler.
2. **Missing Email Transport Configuration (Silent Email Loss) (B-03)**: With no `RESEND_API_KEY` or SMTP credentials configured, real customers will never receive order confirmations, password reset tokens, or corporate inquiry alerts.
3. **Corporate Inquiry Form Submission Silent Failure (B-12)**: If inquiries from the storefront quote modal are failing validation or honeypot checks and not reaching `/admin/inquiries`, high-value corporate B2B leads will be lost.
4. **AdminGuard Skeleton Dark Flash (B-11)**: Violates the pure light look requirement during initial session resolution for OS dark mode users.
5. **Lack of Live Payment & Bank Payout Integration Verification**: Razorpay credentials are test keys and S3 storage for QR uploads is placeholder; live automated withdrawals will fail until real API keys and AWS/Supabase S3 buckets are linked.
