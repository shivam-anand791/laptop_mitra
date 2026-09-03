# Migration Execution Prompt — LaptopMitra PHP → NestJS + Next.js + React Native (v2)

Copy everything below into your coding agent as the task brief. This supersedes the v1 prompt — key changes are marked **[UPDATED]**.

---

## Context

You are migrating an existing PHP/mysqli used-laptop e-commerce site (`public_html.zip`) to a modern stack. The current app includes: product listing/search, cart, wishlist, a referral-code-based flat discount (not a real coupon system), checkout with Razorpay payments, OTP-based auth, an affiliate/"Mitra" tracking system, buyback flow, order/booking management, and a custom admin panel.

**Target stack (decided):**
- Backend API: **NestJS** (TypeScript)
- ORM: **Prisma** [UPDATED — confirmed over TypeORM]
- Database: **MySQL**
- Web frontend: **Next.js** (React)
- Mobile: **React Native** (Expo)
- Payments: **Razorpay**
- File storage: migrate `uploads/` to S3 or Cloudinary — no local disk storage in the new backend

**Repo structure [UPDATED — monorepo, not separate repos]:**
Monorepo using **Turborepo** with pnpm workspaces:
```
apps/
  api/        (NestJS)
  web/        (Next.js)
  mobile/     (React Native / Expo)
packages/
  types/      (shared TypeScript types/DTOs, derived from Prisma's generated client)
  api-client/ (shared fetch/axios wrapper + typed API calls, used by web and mobile)
  config/     (shared eslint/tsconfig base)
```
Keep `packages/types` as the single source of truth for request/response shapes — don't let `web` and `mobile` redefine their own copies.

## Database status [UPDATED — major change]

**There is no staging or production DB access.** Earlier planning assumed staging credentials would be available for schema introspection (`prisma db pull`) — that is no longer the case. Do not attempt to introspect a live database.

Instead: **design a fresh Prisma schema from scratch**, informed by the PHP code's business logic and query patterns (table/column references, relationships implied by joins), not by trying to exactly replicate the legacy schema's types, nullability, or constraints — there is no source of truth to verify guesses against, so don't guess at that level of detail. Model relationships properly with real foreign keys wherever the code implies one (orders→users, laptops→categories, etc.).

**Known fix to build in from the start:** the legacy app has no real coupon system — `ajax/validate_coupon.php` just looks up `users.referral_code` and applies a flat ₹500 discount. Design one proper system that covers both **referral/affiliate tracking** and **discount codes**, rather than two separate systems (this was originally miscategorized as separate Phase 3/Phase 5 work — it's one system).

**Explicit open blocker — do not attempt to solve now:** migrating real production data (existing users, laptop listings, orders) from the old database into the new schema requires DB access that doesn't currently exist. Flag this clearly as a tracked dependency for later, once access is obtained (from the current host, a backup, or whoever manages the live site) — it is not part of the current phase.

## Required rules (non-negotiable)

Follow in this priority order: (1) security rules, (2) ask-before-doing-this hard stops, (3) testing rules for auth/payments/data mutation, (4) code quality rules, (5) git rules, (6) deployment rules (later phase). If these rule files aren't available in-session, ask rather than inventing security assumptions.

## Ask before doing this (hard stops)

- Deleting/dropping any data (moot for now with no DB access, but applies once one exists)
- Using **live** Razorpay keys instead of test/sandbox keys, anywhere in dev/test
- Deploying to a production/live environment
- Changing existing auth/permission logic in ways that could lock out real users
- Sending real emails to real user addresses during dev/testing
- Installing a dependency with broad filesystem/network/system access
- Force-push or history rewrite on a shared branch
- **[UPDATED]** Assuming any specific column type, nullability, or constraint for the new schema without flagging it as a design choice (since nothing can be verified against a real DB right now) — surface these as explicit decisions, not silent assumptions

## Secrets found in the legacy codebase (confirm before touching)

- `config/database.php` — DB password (already flagged for rotation)
- `config/razorpay.php` and `payments/razorpay-config.php` — Razorpay API keys
- SMTP credentials in mail files
- No `.env` currently exists, no git repo currently exists, no `composer.json` (not needed going forward — this was a plain PHP app, not Composer-managed)

All of these move to environment variables in Phase 0. Initialize git with a proper `.gitignore` (excluding `.env`) as the very first step — none of this has ever been under version control.

## Execution plan

**Phase 0 — Setup**
- Initialize git repo + `.gitignore` (exclude `.env`) — first commit, before any other work.
- Set up Turborepo monorepo structure (apps/packages layout above).
- Set up environment variable handling for all secrets listed above — nothing hardcoded, ever.
- Rotate the exposed DB password and Razorpay keys once new secure locations are confirmed with me.

**Phase 1 — Prisma schema design + NestJS API skeleton [UPDATED — was "map existing tables," now "design fresh"]**
- Design the Prisma schema from scratch based on code analysis (grep table/column usage across the PHP codebase), not introspection.
- Show me the drafted `schema.prisma` for review before generating the NestJS modules on top of it — flag every relationship/constraint decision explicitly.
- Implement JWT-based auth replacing PHP session/OTP flow.
- Write tests for auth happy path + failure cases.

**Phase 2 — Read-only endpoints**
- Laptop listings, laptop details, search/filter.

**Phase 3 — Cart, wishlist, discount/referral system [UPDATED — merged, was two separate phases]**
- Port cart and wishlist as authenticated CRUD.
- Build the unified discount + referral/affiliate system (see "Known fix" above) — one Prisma model set, one NestJS module, not two.

**Phase 4 — Checkout + Razorpay (high risk)**
- Test exclusively against Razorpay sandbox/test keys until explicitly told otherwise.
- Require test coverage for payment success, failure, and webhook signature verification.

**Phase 5 — Admin panel**
- Rebuild as an authenticated section of the web app once customer-facing flows are stable. Leave old PHP admin running until confirmed working (if the old app is even still reachable — confirm this, since we don't have DB access to it).

**Phase 6 — Next.js web frontend**
- Build page by page against live API endpoints.

**Phase 7 — React Native mobile app**
- Reuse `packages/api-client` and auth logic from web; build core flows once API and web are stable.

**Phase 8 — Data migration (blocked, tracked separately)**
- Not scheduled yet. Requires obtaining real DB access first. Revisit once that's available.

## Reporting back

After each phase: what was implemented, what was tested and the result, assumptions made, open questions, and anything from the "ask before doing this" list that came up.

---

**Resume from Phase 0/1 with the updated plan above.**
