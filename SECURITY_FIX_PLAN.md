# LaptopMitra — Pre-Launch Security Fix Plan

Source: Pre-Launch Application Security Audit (6 findings).
Scope: `apps/api` (primary), minimal non-visual edits in `apps/web` / `apps/mobile` only when an API contract change forces it.
Hard constraint: **no UI/UX changes of any kind.**

Put this file in the repo (for example `docs/SECURITY_FIX_PLAN.md`) so the agent can read it. Run the phases **in order, one at a time, in a fresh agent session per phase**. Do not start a phase until the previous one is committed and green.

---

## 1. Global Rules (apply to every phase)

Every phase prompt tells the agent to read this section first.

| # | Rule |
|---|------|
| G1 | **Evidence before edits.** Re-verify every finding in the *current* code. Audit line numbers may be stale. Cite `file:line` from the repo as it is now. If the claim does not match the code, mark it `NOT REPRODUCED` and do not "fix" it. |
| G2 | **No UI/UX changes.** Do not touch layout, JSX/TSX markup, styles, CSS/Tailwind classes, visible text/copy, assets, routes, navigation, animations or visual props. Client edits are allowed only in non-visual code (API client, request-payload builders, auth service modules), only when a server contract change forces it, and each one must be listed in the report. After each phase run `git diff --stat -- apps/web apps/mobile` and confirm no markup/style/asset files changed. |
| G3 | **Scope discipline.** Touch only files needed for the current phase. No refactors, renames, formatting sweeps or dependency upgrades. The only new dependency allowed in the whole plan is `helmet` (Phase 4). |
| G4 | **Preserve contracts.** Success-path response shapes consumed by web/mobile must not change. New failure cases must use the API's existing error format. |
| G5 | **Secrets.** Never open, print, log or commit the Firebase service account JSON, `.env` values, tokens or keys. Redact anything token-like in output. |
| G6 | **No fabrication.** Do not invent endpoints, files, env vars, packages, or behavior. Confirm with `grep`/file reads. If something is unknown, write `UNKNOWN` in the report and stop guessing. |
| G7 | **Fail closed.** In production, missing config must stop startup or deny the request. No mock users, synthetic UIDs, hard-coded secrets or permissive fallbacks. |
| G8 | **Tests.** Every fix gets a test that fails before the fix and passes after. Run lint, typecheck, build and tests for touched apps. Record baseline failures in Phase 0; do not attribute pre-existing failures to your changes, and do not "fix" them unless they block the phase. |
| G9 | **Git hygiene.** Work on branch `security/prelaunch-fixes`. One commit per phase (`fix(security): phase N - <summary>`). No push, no force, no history rewrite, no migrations run against any real database, no destructive commands. |
| G10 | **Loop protocol.** Work in iterations (max 6 per phase). Each iteration: re-verify → change smallest thing → run checks → record result. Circuit breaker: if the same problem fails 3 times, stop working on it, document what you tried, and continue with the remaining items. Never claim success without command output as evidence. |
| G11 | **Stop and report instead of guessing** when: a schema change is needed, an endpoint that clients still use would be removed, payment webhook behavior in production would change, or a requirement conflicts with G2. |
| G12 | **Report format.** End every phase with: findings table (id, status, evidence), files changed, tests added, checks run with results, contract changes, client edits (G2), open risks, manual steps for me. |

---

## 2. Audit Triage (corrections to the audit's proposed fixes)

The audit's findings are mostly real, but several of its **suggested code fixes should not be applied as written**. The agent must follow the corrected approach below.

| # | Finding | Triage | Correction to the proposed fix |
|---|---------|--------|--------------------------------|
| 1 | Passwordless token issuance on `/auth/login`, `/auth/register` | **Critical, confirmed class of bug.** | The proposed fix still mints a Firebase custom token after verifying an ID token. That is pointless (the client already holds a valid ID token) and extends the attack surface. Also, matching users by `email` as a fallback (`OR: [{firebaseUid}, {email}]`) risks account takeover through unverified or reused emails. **Correct approach:** remove token minting from login/register entirely. Firebase client SDKs authenticate; the API only verifies ID tokens and syncs a local user keyed by `firebaseUid`. Link by email only if `email_verified` is true and the row has no `firebaseUid` yet. Any seeded admin without a UID is linked by a one-time CLI script, never a public endpoint. |
| 2 | CORS fallback allows any origin with credentials | **High, confirmed class of bug.** | Do not throw `UnauthorizedException` inside the CORS callback; use `callback(null, false)`. In production, an empty `CORS_ORIGINS` must fail startup. Requests without an `Origin` header (native mobile, curl, server-to-server) remain allowed. |
| 3 | Razorpay order amount/ownership trusted from client | **High, confirmed class of bug.** | The proposed fix covers ownership and server amount. It must also: reject orders not in a payable state or already paid; convert rupees to paise correctly; take currency from the server; reuse an existing Razorpay order for the same order (idempotency); verify the payment signature server-side; and make the webhook compare the paid amount and currency to the order before marking it paid. Response shape stays identical so the checkout UI does not change. |
| 4 | Missing security headers (Helmet) | **Medium.** | A default CSP can break Swagger UI, and Helmet's default `Cross-Origin-Resource-Policy: same-origin` can stop the web/mobile apps from loading images the API serves. Configure for those. HSTS only matters over HTTPS. Do **not** add CSP or headers to the Next.js web app in this plan (risk to UI); report it as a follow-up instead. |
| 5 | Coupon validation lacks rate limit | **Medium.** | Apply the stricter throttle, but also confirm the API sees the real client IP behind a proxy (`trust proxy`), otherwise all users share one bucket. Invalid and nonexistent codes must return the same generic response. Cover referral-code endpoints and `/auth/sync` too. |
| 6 | Mock/synthetic fallback users on DB errors | **Low severity, high correctness impact.** | Folded into Phase 1 (same file). Fail closed with 503; never invent users. |

**Gaps the audit did not cover** (checked in Phase 6, report first, fix only clear-cut items): payment webhook signature verification, Swagger exposure in production, `ValidationPipe` whitelist settings, guest/anonymous token privileges, admin route guards, file upload validation, error-handler leakage, env validation at startup.

---

## 3. Phase Overview

| Phase | Name | Findings | Edits code? |
|-------|------|----------|-------------|
| 0 | Baseline and verification | all | No (writes one baseline report) |
| 1 | Authentication hardening | 1, 6 | Yes |
| 2 | Payment integrity | 3 | Yes |
| 3 | CORS lockdown | 2 | Yes |
| 4 | Security headers | 4 | Yes |
| 5 | Rate limiting | 5 | Yes |
| 6 | Gap sweep | extras | Report first, small fixes |
| 7 | Release gate | all | No (verification only) |

---

## Phase 0 — Baseline and Verification (no code edits)

**Goal:** Know the starting state and prove which findings are real in the current code.

**Allowed edits:** create branch, write `docs/security/BASELINE.md`. Nothing else.

**Exit criteria:**
- Branch exists; baseline of build/lint/test results recorded.
- Each of the 6 findings marked `CONFIRMED`, `PARTIAL` or `NOT REPRODUCED` with `file:line` evidence.
- A list of every client call site of the affected endpoints (so later phases know what they can break).

### Prompt

```text
ROLE
You are a careful application security engineer working in my Turborepo monorepo (NestJS API in apps/api, Next.js web, React Native mobile, Prisma/MySQL, Firebase Auth, Razorpay).

FIRST
Read SECURITY_FIX_PLAN.md (in docs/ or repo root), section "1. Global Rules" and "2. Audit Triage". Obey rules G1-G12. Summary: verify before editing, no UI/UX changes, no fabrication, never print secrets, one commit per phase, stop and report instead of guessing.

THIS PHASE: PHASE 0 - BASELINE (NO CODE EDITS)
Your only allowed writes: create git branch `security/prelaunch-fixes` and create `docs/security/BASELINE.md`.

LOOP (max 4 iterations; stop as soon as the exit criteria are met)
Each iteration: do the next unfinished step, record evidence, re-check the exit criteria.

STEPS
1. Create branch security/prelaunch-fixes from the current branch. Record `git status` (must be clean; if not, stop and report).
2. Baseline checks: run install (if needed), lint, typecheck, build, and test for apps/api, apps/web, apps/mobile. Record pass/fail per command, with the first failing error line for failures. Do not fix anything.
3. Verify each audit finding in the CURRENT code. For each, open the actual file and report file:line:
   - F1: apps/api auth service/controller: do login()/register() ignore the password or mint tokens (custom tokens, sessions) without verifying a Firebase ID token? Is there any remaining route that issues credentials from just an email?
   - F2: apps/api/src/main.ts CORS: does the origin callback allow unknown origins with credentials: true?
   - F3: payments controller/service: does POST razorpay order accept client-sent `amount` and `orderId` without ownership check or server-side amount lookup? Is there signature verification and a webhook? Does the webhook compare amount?
   - F4: is helmet installed or used?
   - F5: does the coupon/discount validate endpoint have its own throttle? Is ThrottlerModule configured globally and with what limits? Is `trust proxy` configured?
   - F6: auth service catch blocks that fabricate users, UIDs or tokens on DB errors.
4. Caller map: grep apps/web, apps/mobile, packages/* for every caller of: /auth/login, /auth/register, /auth/sync (or equivalents), the Razorpay order endpoint, the discount/validate endpoint. List file:line and the payload each sends and the response keys each reads (for example access_token vs accessToken).
5. Write docs/security/BASELINE.md containing: baseline check table, finding table (id | status CONFIRMED/PARTIAL/NOT REPRODUCED | file:line | one-line evidence), caller map, and any UNKNOWN items.
6. Do NOT modify any other file. Confirm with `git status` that only BASELINE.md is new.

EXIT CONDITION
BASELINE.md exists, every finding has a status with file:line evidence, and the caller map is complete. Then stop. Do not start fixing.

FINAL REPORT
Use rule G12 format (adapted: no code changes). Never include secret values.
```

---

## Phase 1 — Authentication Hardening (Findings 1 and 6)

**Goal:** No endpoint can issue a session or token from an email alone; the API trusts only verified Firebase ID tokens; no mock users on errors.

**Files likely involved:** `auth.service.ts`, `auth.controller.ts`, auth DTOs, auth tests, `firebase.service.ts` (only if a helper is needed), client auth modules (non-visual) if they still call `/auth/login` or `/auth/register`.

**Exit criteria:**
- No route mints a token or session without a verified Firebase ID token.
- Users are keyed by `firebaseUid`; the client cannot set role, email, or UID.
- DB errors return 503/500 with a generic message; no synthetic users or UIDs exist anywhere.
- Web and mobile auth still work with unchanged UI.

### Prompt

```text
ROLE
You are a careful application security engineer in my Turborepo monorepo (NestJS API, Next.js web, React Native mobile, Prisma/MySQL, Firebase Auth).

FIRST
Read SECURITY_FIX_PLAN.md sections "1. Global Rules", "2. Audit Triage" (finding 1 and 6 corrections) and docs/security/BASELINE.md. Obey G1-G12. Summary: verify before editing, NO UI/UX changes, no fabrication, never print secrets, fail closed, one commit for this phase.

THIS PHASE: PHASE 1 - AUTH HARDENING (findings 1 and 6)

GOAL
Firebase client SDKs authenticate users. The API only verifies Firebase ID tokens and maps firebaseUid to a local User. Nothing may issue a token or session from an email or an unverified body.

LOOP (max 6 iterations; stop when the exit condition is met)
Each iteration: (1) re-verify the current behavior with a reproduction or test, (2) make the smallest correct change, (3) run lint/typecheck/build/tests for touched apps, (4) record evidence, (5) re-check the exit condition. If one problem fails 3 times, document it and move on.

STEPS
1. Reproduce F1: write a failing API test showing that POST /auth/login (and /auth/register) with only { email } of an existing user returns a token/session. Show the failing output.
2. Decide the endpoint set using BASELINE.md's caller map:
   - Preferred: remove token minting from login/register. Keep ONE identity entry point (the existing sync endpoint, for example /auth/sync) that requires a valid Firebase ID token via the global guard, then upserts the local user by firebaseUid.
   - If web/mobile still call /auth/login or /auth/register, update only those NON-VISUAL call sites to use the Firebase SDK sign-in plus the sync endpoint, keeping the same UI behavior and messages. If this cannot be done without a visual change, STOP and report (G11).
   - If an endpoint must remain temporarily for compatibility, it must verify a Firebase ID token and must not mint a new token. Do not return custom tokens.
3. User linking rules in the sync logic:
   - Look up by firebaseUid first.
   - Email-based linking only if decodedToken.email_verified === true AND the existing row has no firebaseUid. Otherwise create a new user or reject; never overwrite an existing firebaseUid.
   - Email, UID, provider and email-verified come from the VERIFIED token, never the request body. The body may carry only safe profile fields already used today (for example name, phone). Role can never come from the client; default role comes from the server.
   - Anonymous (guest) tokens map to a restricted guest user, not CUSTOMER with full rights, consistent with existing behavior.
   - Make the upsert race-safe (parallel first-login calls must create exactly one row; handle unique-constraint conflicts by re-reading, not 500).
4. Seeded admin: if an admin user exists in seed data without a firebaseUid, do NOT add a public linking path. Provide a one-off script under apps/api/scripts (or the existing scripts folder) that links a given email to a given Firebase UID, run manually by me. Document usage in the report. No secrets in the script.
5. F6: remove every catch block that fabricates a user, uid, id (for example "usr_..." or "uid_...") or token. On DB failure, throw ServiceUnavailableException with a generic message and log the sanitized real error with the Nest Logger (no tokens, no keys).
6. Keep response shapes consumed by clients unchanged for success paths (G4). If clients read both accessToken and access_token, check what they actually use; do not break them, and report the mismatch.
7. Tests (mock firebase-admin; never call real Firebase): no token -> 401; invalid/expired token -> 401; email-only login attempt -> rejected; valid token new user -> one row, default role; valid token existing user -> same row, idempotent; parallel first-login -> one row; client-sent role/email/uid ignored; unverified-email linking refused; DB error -> 503 with no synthetic user; anonymous token -> restricted.
8. Run lint, typecheck, build, tests for apps/api and any client you touched. Run `git diff --stat -- apps/web apps/mobile` and confirm no markup/style/asset files changed (G2).
9. grep the repo for leftovers: "usr_", "uid_", "createCustomToken", "mock", hard-coded emails like admin@, and fallback secrets. Report each hit.
10. Commit: `fix(security): phase 1 - harden auth, remove passwordless token issuance`.

EXIT CONDITION
- Reproduction test for F1 now passes (login with email only is rejected).
- No code path issues tokens/sessions without a verified Firebase ID token.
- No synthetic users/UIDs remain.
- All tests green; no UI files changed; no secrets printed or staged.

FINAL REPORT
G12 format. Include before/after proof of the F1 reproduction, list of client call sites changed (non-visual only), and the admin-linking script usage.
```

---

## Phase 2 — Payment Integrity (Finding 3)

**Goal:** The amount, currency and ownership of every Razorpay order come from the server; payments can only mark the correct order paid for the correct amount.

**Files likely involved:** `payment.controller.ts`, `payment.service.ts`, payment DTOs and tests, webhook handler, the checkout client call (non-visual payload only).

**Exit criteria:**
- Client can send only `orderId`; amount is read from the order in the database.
- Another user's order cannot be paid or touched.
- Webhook and verify paths reject amount, currency or signature mismatches.
- Checkout UI unchanged.

### Prompt

```text
ROLE
You are a careful application security engineer in my Turborepo monorepo (NestJS API, Next.js web, React Native mobile, Prisma/MySQL, Razorpay).

FIRST
Read SECURITY_FIX_PLAN.md sections "1. Global Rules", "2. Audit Triage" (finding 3 corrections) and docs/security/BASELINE.md. Obey G1-G12. Summary: verify before editing, NO UI/UX changes, no fabrication, never print secrets, fail closed, one commit for this phase.

THIS PHASE: PHASE 2 - PAYMENT INTEGRITY (finding 3)

LOOP (max 6 iterations; stop when the exit condition is met)
Each iteration: (1) re-verify with a reproduction/test, (2) smallest correct change, (3) run lint/typecheck/build/tests, (4) record evidence, (5) re-check the exit condition. Circuit breaker: 3 failed attempts on one problem -> document and move on.

STEPS
1. Map the current payment flow with file:line: create-order endpoint, verify-payment endpoint, webhook handler, how order status is updated, how amounts are stored (Decimal/paise/rupees), which payload checkout clients send (use BASELINE.md caller map).
2. Reproduce F3 with failing tests: (a) create-order with a client-sent amount different from the order's final amount, (b) create-order for another user's orderId.
3. Fix create-order:
   - Accept only orderId from the client. Ignore any client-sent amount or currency.
   - Load the order; 404 if missing; 403 if order.userId !== req.user.id (admins only if admin payment-on-behalf is an existing, intended feature; otherwise customers only. Do not invent behavior; report if unclear).
   - Reject if the order is not in a payable state or is already paid.
   - amount = server order final amount converted to paise with safe rounding (no float errors; use integer math/Decimal), currency from server config (INR).
   - Idempotency: if a Razorpay order already exists for this order and is still valid, return it instead of creating another. If the schema has no field to store the Razorpay order id, STOP and report (G11); do not change the schema on your own.
   - Response shape identical to today's so checkout code and UI do not change.
4. Verify-payment path: confirm server-side verification of razorpay_signature using the key secret (HMAC of order_id|payment_id), timing-safe comparison, and that the order being verified belongs to the user and matches the stored Razorpay order id. Fix only if missing or wrong.
5. Webhook: confirm signature verification of the raw body with the webhook secret before any state change. Before marking paid, check that the paid amount (in paise) and currency equal the stored order amount and currency, and that the event is not already processed (idempotent). If any check is missing, add it. Do not change production webhook URL or event subscriptions; report if those need changes.
6. Client edit (only if necessary and only non-visual): if the checkout client sends `amount`, remove it from the payload builder only. No visible text/markup/style changes (G2).
7. Tests (mock Razorpay SDK; no real network): client amount ignored; other user's order -> 403; unknown order -> 404; already-paid order -> rejected; paise conversion exact for decimals like 79999.99; idempotent repeat call; invalid signature -> rejected; webhook with wrong signature -> rejected; webhook with amount mismatch -> not marked paid; duplicate webhook -> processed once.
8. Run lint, typecheck, build, tests; check `git diff --stat -- apps/web apps/mobile` for G2.
9. Secrets check: confirm the Razorpay key secret and webhook secret are read only from server env/config and are not logged. Do not print them.
10. Commit: `fix(security): phase 2 - server-side Razorpay amount and ownership checks`.

EXIT CONDITION
- F3 reproduction tests now fail safely (attacker cannot lower the amount or use another user's order).
- Signature and webhook checks verified or added.
- All tests green; checkout response shape unchanged; no UI files changed.

FINAL REPORT
G12 format. Include the before/after request/response samples for create-order (redacted), the tests added, and any manual Razorpay dashboard steps for me.
```

---

## Phase 3 — CORS Lockdown (Finding 2)

**Goal:** Browsers can only call the API from approved origins. Native apps and server-to-server calls (no `Origin` header) keep working.

**Exit criteria:**
- Unknown origins get no CORS headers; configured and (non-production) local origins work.
- Production refuses to start if `CORS_ORIGINS` is empty.
- Web and mobile still work.

### Prompt

```text
ROLE
You are a careful application security engineer in my Turborepo monorepo (NestJS API, Next.js web, React Native mobile).

FIRST
Read SECURITY_FIX_PLAN.md sections "1. Global Rules", "2. Audit Triage" (finding 2 corrections) and docs/security/BASELINE.md. Obey G1-G12. Summary: verify before editing, NO UI/UX changes, no fabrication, never print secrets, fail closed, one commit for this phase.

THIS PHASE: PHASE 3 - CORS LOCKDOWN (finding 2)

LOOP (max 5 iterations; stop when the exit condition is met)
Each iteration: (1) re-verify, (2) smallest change, (3) run lint/typecheck/build/tests, (4) record evidence, (5) re-check the exit condition. Circuit breaker: 3 failed attempts on one problem -> document and move on.

STEPS
1. Show the current CORS configuration in apps/api/src/main.ts with file:line, and list env vars the API already uses for CORS (grep; do not invent names).
2. Reproduce F2: with the API running (or in an e2e test), send a request with `Origin: https://attacker.example` and show that the response currently includes Access-Control-Allow-Origin for that origin with credentials.
3. Implement:
   - Allowed origins come from the existing CORS env var (comma-separated, trimmed, empty entries removed). Use the existing name; if none exists, use CORS_ORIGINS and add it to .env.example.
   - Requests with no Origin header are allowed (mobile native, curl, server-to-server).
   - Origins in the allow-list are allowed.
   - In NON-production only: allow http://localhost:<port>, http://127.0.0.1:<port>, and private-network dev origins that the project's dev flow needs (for example Android emulator 10.0.2.2, LAN IPs for Expo web). Keep the pattern tight; no wildcards.
   - Anything else: `callback(null, false)` (no CORS headers). Do NOT throw exceptions inside the CORS callback.
   - In production, if the allow-list is empty, fail startup with a clear error naming the missing variable (name only).
   - Keep `credentials: true` only if the project actually uses cookies/credentialed requests; if auth is purely Bearer tokens, report this and keep the current setting unless I approve changing it (changing could break clients).
   - Keep methods/headers behavior as it is today.
4. Update .env.example(s) and the API README with the variable and examples. No real secrets or private URLs.
5. Tests: unknown origin -> no ACAO header; allowed origin -> header present; no Origin header -> request succeeds; production mode with empty list -> bootstrap throws; non-production local origin -> allowed; preflight OPTIONS from an allowed origin works for Authorization header.
6. Run lint, typecheck, build, tests. Start the API and confirm web (localhost) still gets data. Check `git diff --stat -- apps/web apps/mobile` (G2).
7. Commit: `fix(security): phase 3 - strict CORS allow-list`.

EXIT CONDITION
- The reproduction for an attacker origin now returns no CORS allow headers.
- Allowed origins, no-Origin requests and local dev origins work.
- Production fails closed on missing config.
- All tests green; no UI files changed.

FINAL REPORT
G12 format. Include the before/after curl output for the attacker origin and the manual step I need: set the production CORS variable to my real web domains.
```

---

## Phase 4 — Security Headers (Finding 4)

**Goal:** The API sends standard security headers without breaking Swagger (if enabled) or image/asset loading in web and mobile.

**Exit criteria:**
- Responses include nosniff, frame protection, HSTS (when served over HTTPS), and referrer policy.
- Images/static files served by the API still load in web and mobile.
- Swagger still works in non-production, or is disabled in production (report which).

### Prompt

```text
ROLE
You are a careful application security engineer in my Turborepo monorepo (NestJS API, Next.js web, React Native mobile).

FIRST
Read SECURITY_FIX_PLAN.md sections "1. Global Rules", "2. Audit Triage" (finding 4 corrections) and docs/security/BASELINE.md. Obey G1-G12. Summary: verify before editing, NO UI/UX changes, no fabrication, never print secrets, fail closed, one commit for this phase. The ONLY new dependency allowed in this phase is `helmet`.

THIS PHASE: PHASE 4 - SECURITY HEADERS (finding 4)

LOOP (max 5 iterations; stop when the exit condition is met)
Each iteration: (1) re-verify, (2) smallest change, (3) run lint/typecheck/build/tests, (4) record evidence, (5) re-check the exit condition. Circuit breaker: 3 failed attempts on one problem -> document and move on.

STEPS
1. Record current response headers of the API (a normal JSON endpoint, an error response, the Swagger page if mounted, and a static/upload/image URL if the API serves one). Show them with file:line for where the app is bootstrapped.
2. Find out how the API serves images/static files and Swagger (grep ServeStaticModule, useStaticAssets, SwaggerModule). Report what exists; do not assume.
3. Install helmet in apps/api using the repo's package manager. Mount it in main.ts before other middleware with these considerations:
   - Content-Security-Policy: for a JSON API, enable the default CSP only if Swagger is not served in that environment; if Swagger is mounted in production, either disable Swagger in production (preferred; report this as a behavior change for me to approve) or relax the CSP minimally for the Swagger route only.
   - Cross-Origin-Resource-Policy: if the API serves images/uploads that web or mobile load from a different origin, set crossOriginResourcePolicy to "cross-origin". Otherwise images would break and that is a UI regression (G2).
   - crossOriginEmbedderPolicy: false.
   - HSTS: leave Helmet's default for production; do not force it in local development.
   - Disable `x-powered-by`.
4. Do NOT add headers or CSP to the Next.js web app in this phase (risk to UI). Instead, write a short follow-up note in the report on adding report-only CSP to web later.
5. Verify: re-capture headers for the same four URLs and show before/after. Start web and confirm images/product assets from the API still load (take the response status codes as evidence; if you cannot run a browser, say so).
6. Tests: an e2e/supertest test asserting X-Content-Type-Options: nosniff, X-Frame-Options (or frame-ancestors), absence of X-Powered-By, and that a static asset response carries the CORP value you chose.
7. Run lint, typecheck, build, tests. Check `git diff --stat -- apps/web apps/mobile` (G2).
8. Commit: `fix(security): phase 4 - add helmet security headers`.

EXIT CONDITION
- Before/after headers captured; the expected headers are present.
- Static assets and Swagger (if kept) still work.
- All tests green; no UI files changed.

FINAL REPORT
G12 format. Include the header diff table and any decision I must approve (for example, Swagger disabled in production).
```

---

## Phase 5 — Rate Limiting (Finding 5)

**Goal:** Coupon and referral-code guessing and auth-sync abuse are throttled per real client IP, with generic responses.

**Exit criteria:**
- The strict limit applies to coupon validation, referral-code endpoints, and the auth sync endpoint.
- The API sees the real client IP in the intended deployment.
- Invalid and nonexistent codes return the same generic response.

### Prompt

```text
ROLE
You are a careful application security engineer in my Turborepo monorepo (NestJS API, Next.js web, React Native mobile).

FIRST
Read SECURITY_FIX_PLAN.md sections "1. Global Rules", "2. Audit Triage" (finding 5 corrections) and docs/security/BASELINE.md. Obey G1-G12. Summary: verify before editing, NO UI/UX changes, no fabrication, never print secrets, fail closed, one commit for this phase.

THIS PHASE: PHASE 5 - RATE LIMITING (finding 5)

LOOP (max 5 iterations; stop when the exit condition is met)
Each iteration: (1) re-verify, (2) smallest change, (3) run lint/typecheck/build/tests, (4) record evidence, (5) re-check the exit condition. Circuit breaker: 3 failed attempts on one problem -> document and move on.

STEPS
1. Show the current ThrottlerModule configuration (limits, ttl, named throttlers, global guard registration, skip rules) with file:line. Confirm the guard is actually registered globally (APP_GUARD) and not just imported.
2. Find all endpoints where guessing is possible: coupon/discount validate, referral-code lookup/apply, auth sync, any "check code" or OTP-like endpoint (grep; do not assume). List each with its current limit.
3. Reproduce F5: a test or script that sends more than 10 validate requests per minute and shows they all succeed (before) .
4. Apply stricter @Throttle limits using the project's installed @nestjs/throttler version syntax (check the installed version's API before writing the decorator; do not copy syntax blindly):
   - coupon validate and referral-code endpoints: 10 requests per 60 seconds per client.
   - auth sync endpoint: a sensible limit that does not affect normal app start-up (for example 20 per minute); justify the value.
   Do not change limits of unrelated endpoints.
5. Client IP: check whether the API runs behind a reverse proxy or load balancer in my deployment notes/config. If yes, configure Express `trust proxy` through an env-driven setting (default off in development) so the throttler keys on the real client IP. If deployment details are unknown, add the env-driven setting and report UNKNOWN for the value I must set.
6. Responses: confirm invalid code and nonexistent code return the same generic response and status, so codes cannot be enumerated; fix only if they differ, without changing the success shape. The throttled response is the standard 429.
7. Make sure client code does not need changes. If a client shows raw 429 errors differently from other errors, only report it; do not change UI (G2).
8. Tests: the 11th request in a minute to validate returns 429; limits are per client IP; other endpoints keep their previous limits; generic response parity for invalid vs unknown code.
9. Run lint, typecheck, build, tests. Check `git diff --stat -- apps/web apps/mobile` (G2).
10. Commit: `fix(security): phase 5 - strict throttling for code-guessing endpoints`.

EXIT CONDITION
- The reproduction now returns 429 after the configured limit.
- All guessing endpoints found are covered.
- trust proxy handled via env; generic responses verified.
- All tests green; no UI files changed.

FINAL REPORT
G12 format. Include the endpoint/limit table and the env value I must set for my production proxy setup.
```

---

## Phase 6 — Gap Sweep (report first, then small safe fixes)

**Goal:** Check the security areas the audit did not cover. Fix only clear-cut, low-risk items; report everything else for a decision.

**Exit criteria:**
- Every checklist item has a status with evidence.
- Only the "safe to auto-fix" items are changed; the rest are listed for approval.

### Prompt

```text
ROLE
You are a careful application security engineer in my Turborepo monorepo (NestJS API, Next.js web, React Native mobile, Prisma/MySQL, Firebase Auth, Razorpay).

FIRST
Read SECURITY_FIX_PLAN.md sections "1. Global Rules" and "2. Audit Triage" and docs/security/BASELINE.md. Obey G1-G12. Summary: verify before editing, NO UI/UX changes, no fabrication, never print secrets, fail closed, one commit for this phase.

THIS PHASE: PHASE 6 - GAP SWEEP (report first, then only safe fixes)

LOOP (max 6 iterations; stop when the exit condition is met)
Iteration 1-2: audit and write the report only. Iteration 3-6: fix only items classified SAFE TO FIX below, one at a time, with a test each. Circuit breaker: 3 failed attempts on one problem -> document and move on.

CHECKLIST (verify each in the current code; status PASS / FAIL / UNKNOWN with file:line)
1. Payment webhook: raw-body signature verification, replay/idempotency protection (if Phase 2 already covered it, mark PASS and reference it).
2. Swagger/OpenAPI and any debug/health endpoints: exposed in production? Do they leak internals?
3. Global ValidationPipe: whitelist: true, forbidNonWhitelisted (or equivalent), transform settings; do any controllers accept raw `any` bodies?
4. Guest/anonymous Firebase users: which routes can they reach? Can a guest place orders, view other users' data, call admin routes? Check role/guard coverage on every controller (list controllers with no explicit guard and whether each is intentionally @Public()).
5. Admin routes: every admin controller protected by RolesGuard with ADMIN, and the role read from the DB user, never from the client.
6. File uploads (avatars, product images, ticket attachments): type allow-list, size limit, filename sanitization, storage path traversal, public access to private files.
7. Error handling: does any exception filter or default behavior return stack traces, SQL/Prisma errors, or internal paths to clients in production?
8. Env validation at startup: required secrets validated; no hard-coded fallbacks for JWT/Firebase/Razorpay/DB secrets (grep for `||` fallbacks on config values).
9. Logging: any logging of Authorization headers, tokens, full request bodies with PII or payment data.
10. Prisma: any $queryRawUnsafe/$executeRawUnsafe use; any select/include that returns sensitive fields (firebaseUid, internal flags, other users' data) in API responses.
11. Dependency audit: run the package manager's audit (for example `pnpm audit --prod`) and report high/critical advisories with the affected package. Do not upgrade packages in this phase; list them.

CLASSIFICATION
- SAFE TO FIX (do it): enabling ValidationPipe whitelist ONLY if tests show no existing client payload breaks; adding missing @Roles/@UseGuards on admin-only routes that are clearly admin-only; stopping stack-trace leakage in production; removing token/header logging; adding upload size/type limits that match what clients already send.
- NEEDS MY DECISION (report only, do not change): anything that could change what a screen shows or accepts, schema changes, disabling endpoints in use, dependency upgrades, rate-limit values for authenticated flows.

STEPS
1. Produce docs/security/GAP_SWEEP.md with the checklist table (item | status | evidence | classification | proposed fix).
2. Fix SAFE TO FIX items with tests. Keep success-path shapes unchanged (G4).
3. Run lint, typecheck, build, tests. Check `git diff --stat -- apps/web apps/mobile` (G2).
4. Commit: `fix(security): phase 6 - gap sweep fixes and report`.

EXIT CONDITION
GAP_SWEEP.md complete with evidence for all 11 items; all SAFE TO FIX items fixed with tests or documented as blocked; NEEDS MY DECISION list is explicit; all tests green; no UI files changed.

FINAL REPORT
G12 format plus the decision list for me.
```

---

## Phase 7 — Release Gate (verification only)

**Goal:** Prove the whole branch is safe to merge: no regressions, no UI changes, no secrets, all findings closed.

**Exit criteria:** every item below passes with evidence; the agent makes no new fixes (if something fails, it reports back to the owning phase).

### Prompt

```text
ROLE
You are a release security reviewer in my Turborepo monorepo (NestJS API, Next.js web, React Native mobile, Prisma/MySQL, Firebase Auth, Razorpay).

FIRST
Read SECURITY_FIX_PLAN.md sections "1. Global Rules" and "2. Audit Triage", docs/security/BASELINE.md and docs/security/GAP_SWEEP.md. Obey G1-G12.

THIS PHASE: PHASE 7 - RELEASE GATE (VERIFY ONLY, NO NEW FIXES)
Allowed writes: docs/security/RELEASE_REPORT.md only. If a check fails, do not fix it; record it with evidence and name the phase that owns it.

LOOP (max 3 iterations)
Each iteration: run every gate below, record results, and stop when all gates are recorded. Re-run a gate only if its result was inconclusive.

GATES
1. Branch state: `git log --oneline` shows one commit per phase on security/prelaunch-fixes; working tree clean.
2. Full checks: install, lint, typecheck, build, test for apps/api, apps/web, apps/mobile. Compare against the Phase 0 baseline; any new failure is a blocker.
3. UI/UX guard: `git diff --stat main...HEAD -- apps/web apps/mobile` (use the correct base branch). List every changed file. Flag ANY file that contains JSX/TSX markup, styles, CSS/Tailwind classes, assets, or visible text changes. Only non-visual client files (API client, payload builders, auth service modules) are acceptable; show the diff hunks for those.
4. Finding re-test, each with command output:
   - F1: POST /auth/login and /auth/register with only { email } -> no token/session; unauthenticated call to protected route -> 401; valid Firebase emulator token -> OK.
   - F2: Origin https://attacker.example -> no ACAO; allowed origin -> ACAO present; no Origin -> works.
   - F3: create-order with a tampered amount is ignored; other user's order -> 403.
   - F4: security headers present; images/static assets still load.
   - F5: 11th validate request within a minute -> 429.
   - F6: grep shows no synthetic user/UID creation.
5. End-to-end smoke (API + web, mobile if possible): guest sign-in, signup, login, product list, cart add, checkout order creation, logout. State clearly what could not be verified without a device or real Razorpay.
6. Secrets scan: `git diff main...HEAD` and `git ls-files` contain no service account JSON, .env, private keys, tokens or Razorpay secrets. Show only file names, never values.
7. Env checklist for production (names only): list every env var the API needs (Firebase, CORS origins, Razorpay key and webhook secret, DB, trust-proxy setting, Swagger flag). Flag any that are missing from .env.example.
8. Open items: list everything from the Phase 6 "needs my decision" list and any UNKNOWN items.

EXIT CONDITION
RELEASE_REPORT.md contains a PASS/FAIL table for all gates with evidence. Recommend GO only if every gate passes; otherwise NO-GO with the owning phase for each failure.

FINAL REPORT
A concise GO/NO-GO summary, the gate table, and the manual steps I must do before launch (set production env vars, Razorpay dashboard webhook secret, apply migrations, rotate any key that was ever exposed).
```

---

## 4. Manual Steps for You (outside the agent)

1. Create a git branch and commit your current working state before starting Phase 0.
2. Run each phase in a **fresh agent session**. Paste only that phase's prompt.
3. After each phase, skim `git diff --stat` yourself. Anything under `apps/web` or `apps/mobile` that is not an API client file deserves a look.
4. Before launch: set production `CORS_ORIGINS`, Razorpay key and webhook secret, the trust-proxy setting, and rotate any secret that was ever pasted into a chat or committed.
5. Keep Firebase Auth Emulator available for tests so no junk users are created in the real project.
