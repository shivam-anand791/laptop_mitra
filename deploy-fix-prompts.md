# LaptopMitra — Fix Prompts for Deployment (Firebase branch)

Written for branch `security/prelaunch-fixes` (Firebase Auth, PostgreSQL, Razorpay test mode). Paste **one at a time, in order**, into your coding agent opened at the repo root. Commit after each prompt passes so any step can be rolled back. Read `predeploy.md` first; blocker IDs (B1…) refer to it.

**Rules that apply to every prompt:**
- Do not touch `apps/mobile`, `packages/env`, `rules/`, `memory/`, `docs/`.
- Never print, commit or invent real secrets (including the Firebase service-account JSON). Placeholders only.
- Never run a command against a production database. Local/test databases only.
- If something needs network access or a database you don't have, say so instead of guessing.

**Order:** 1 → 2 → 3 → 4 → 5 → deploy → 6 (audit). Prompt 1 is already done locally; it only needs finishing and pushing.

---

## Prompt 1 — Finish and push the repo cleanup (B7)

```
Prompt 1 (repo hygiene) was already run locally. Finish it and make it ready to push.

1. Run `git status` and summarize the staged and unstaged changes. Confirm these are gone from the index: `.pnpm-store`, `.turbo`, any `dist` folder, `*.tsbuildinfo`, root `package-lock.json`, nested `pnpm-lock.yaml` / `pnpm-workspace.yaml` under apps/*, `apps/apps/`, and root `prisma/schema.prisma`.
2. Also untrack `.playwright-mcp/` (about 50 tracked files; `git rm -r --cached .playwright-mcp`) and add `.playwright-mcp` to `.gitignore`.
3. Check that `.gitignore` still ignores `apps/api/secrets/`, `*firebase*service-account*.json`, `*firebase-adminsdk*.json`, `.env`, `.env.*` (but not `.env.example`).
4. Run `git ls-files | grep -iE "service-account|adminsdk|\.env$|secrets/"` and `git grep -nE "BEGIN (RSA )?PRIVATE KEY" -- . ':!*test*' ':!*.example'`. Both must print nothing real. Report any hit; do not print key contents.
5. Confirm `apps/api/prisma/schema.prisma` is the only schema and contains the Firebase fields (firebaseUid, authProvider, isGuest).
6. Run `pnpm install --frozen-lockfile` once more.
7. Commit with a clear message. Do NOT push; tell me the commit hash.

Acceptance: `git ls-files | grep -E "dist/|\.turbo|\.pnpm-store|\.playwright-mcp|package-lock"` prints nothing, only the root `pnpm-lock.yaml` exists, frozen install passes.
```

---

## Prompt 2 — Baseline migration for a fresh PostgreSQL database (B1)

```
Problem: `apps/api/prisma/migrations/` contains only `20261003180000_firebase_auth`, an incremental migration (ALTER/DROP on RefreshToken, OtpAttempt, User). It has no CREATE TABLE statements, so `prisma migrate deploy` fails on an empty database. No production database exists yet, so replace the history with one baseline generated from the current schema.

Do exactly this:
1. Start a LOCAL throwaway PostgreSQL (e.g. `docker run --name lm-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=lm_test -p 5432:5432 -d postgres:16`). If docker is unavailable, stop and tell me.
2. Delete the folder `apps/api/prisma/migrations/20261003180000_firebase_auth`. Keep `migration_lock.toml` (provider "postgresql").
3. Generate the baseline: `pnpm --filter api exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` and write the output to `apps/api/prisma/migrations/20261005000000_init/migration.sql` (run from the apps/api directory so paths resolve; adjust the path if needed).
4. Prove it: with DATABASE_URL pointing ONLY at the local throwaway DB, run `pnpm --filter api exec prisma migrate deploy`, then `pnpm --filter api exec prisma migrate status` (must say the database schema is up to date), then `pnpm --filter api exec prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code` (must report no difference).
5. Check the SQL creates the `User` table with `firebaseUid` unique, nullable `email`, role default 'CUSTOMER', and that there is no RefreshToken, OtpAttempt or password column.
6. Add scripts to apps/api/package.json: `"prisma:migrate:deploy": "prisma migrate deploy"`.
7. Check `prisma/seed-catalog.ts`: it upserts categories and products but inserts product images with create(). Make the image insert idempotent (delete-and-recreate images for that product inside the same transaction, or upsert on a stable key) and prove by running the seed twice and showing identical row counts.
8. Add `docs/deploy-database.md` (short): generate, migrate deploy, seed, the warning "never run migrate dev, migrate reset or db push against production", and that a developer database previously created from the old migration must be dropped/recreated locally.

Never run any of this against a non-local database.

Acceptance: from an empty local Postgres, migrate deploy succeeds, migrate status is clean, the diff against the schema is empty, and the seed runs twice with identical counts.
```

---

## Prompt 3 — Webhook raw body and API production flags (B2, S1, S2)

```
Goal: make the Razorpay webhook verify what Razorpay actually signed, and tidy production settings. Keep the existing server-side checkout validation and timing-safe checks as they are.

1. apps/api/src/main.ts: create the app with `NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true })`. Keep helmet, CORS fail-closed, trust proxy and the 0.0.0.0 listen exactly as they are.
2. apps/api/src/modules/payments/payment.controller.ts: change the webhook handler to take `@Req() req: RawBodyRequest<Request>` and pass `req.rawBody` (a Buffer) plus the x-razorpay-signature header to the service. In payment.service.ts verify HMAC-SHA256 over the raw bytes with RAZORPAY_WEBHOOK_SECRET (keep the equal-length check + crypto.timingSafeEqual), and only then JSON.parse the raw body. A missing or invalid signature must throw BadRequestException (HTTP 400), not return 200 with { valid:false }.
3. Make webhook processing idempotent: if the Payment/Order is already COMPLETED for that razorpay payment id, return 200 without re-applying or re-notifying.
4. Swagger: mount it only when NODE_ENV !== 'production' or ENABLE_SWAGGER === 'true'.
5. apps/api/.env.example: add RAZORPAY_WEBHOOK_SECRET and ENABLE_SWAGGER=false, add a comment that FIREBASE_SERVICE_ACCOUNT_PATH is for local development only and production must use FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY, and remove SMTP_* entries unless some code under apps/api/src reads them (grep first and tell me what you found).
6. If the root `.env.example` is the old MySQL/JWT template, delete it or put a first-line comment "unused template, not the API config".
7. Tests (extend the existing Jest suite): webhook with a body signed by a known test secret is accepted; same body with one byte changed is rejected with 400; missing signature gives 400; replaying the same event is a no-op; /api is 404 in production mode unless ENABLE_SWAGGER=true.

Acceptance: `pnpm --filter api test` passes and `pnpm --filter api build` succeeds (if Prisma cannot download its engine in this environment, say so and run what you can).
```

---

## Prompt 4 — Web production config: Firebase, API URL, Razorpay key (B3)

```
Goal: `apps/web` must never run in production with dummy or localhost config.

1. Create `apps/web/lib/config.ts` that reads and exports: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_RAZORPAY_KEY_ID, and the six NEXT_PUBLIC_FIREBASE_* values (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID). In development (NODE_ENV !== 'production') you may default the API URL to http://localhost:3001 and allow the Firebase emulator settings. In production a missing value must throw at build time with a message naming the variable (never printing values). The API URL must be https and have no trailing slash (normalise it).
2. Update `apps/web/lib/firebase.ts` to use config.ts and delete every dummy fallback ('AIzaSyDemoDummyKey…', 'laptop-mitra', '1234567890', '1:1234567890:web:…'). Emulator use must be impossible in production builds, even if NEXT_PUBLIC_USE_FIREBASE_EMULATOR is set.
3. Update `apps/web/lib/api.ts` and `apps/web/app/checkout/page.tsx` to use config.ts. Remove the hardcoded 'rzp_test_S3KeoVspM7qt2w' fallback; if the key is missing at checkout, show "Payments are not configured" instead of opening Razorpay.
4. Add `apps/web/.env.example` listing all NEXT_PUBLIC_ variables with placeholders and a comment that they are baked in at build time (changing them in Vercel needs a redeploy) and that the emulator variables are development-only.
5. `apps/web/next.config.ts`: replace `hostname: "**"` with an allow-list read from NEXT_PUBLIC_IMAGE_HOSTS (comma-separated). If unset, allow only the hosts actually used by seeded product images (grep the seed/mock data and tell me which); keep `outputFileTracingRoot`.
6. Verify: `pnpm exec tsc --noEmit` and `pnpm build` in apps/web with all variables set to obviously fake but well-formed placeholder values; then confirm the build FAILS with a clear message when NEXT_PUBLIC_API_URL is unset in production mode. If next build fails only because Google Fonts is unreachable in this environment, say so and do not remove the font.
7. `grep -rn "rzp_test_\|AIzaSy\|localhost" apps/web/app apps/web/lib apps/web/components` should show no production-reachable hardcoded values.

Acceptance: as above, plus the login/register pages still compile.
```

---

## Prompt 5 — Roles, admin bootstrap and guest safety (B6)

```
Goal: safe role handling with no client-controlled privilege escalation, and a documented way to create the first admin.

1. Read apps/api/src/auth/auth.service.ts, auth.controller.ts, firebase-auth.guard.ts and the users module. List every place `role`, `status`, `firebaseUid`, `isGuest` or `email` can be written, and which request fields can reach them.
2. Confirm (with a test) that no authenticated request, including profile update and the Firebase sync/login endpoint, can set role, status or firebaseUid from the request body, and that role comes only from the database. Fix anything that breaks this.
3. Confirm GUEST users cannot reach admin routes, create payments, or write product data, and that a guest upgrading to a real account keeps data intact (existing behaviour at auth.service.ts ~line 112 sets role CUSTOMER).
4. Add `apps/api/scripts/promote-admin.ts` (run with ts-node) that takes an email and sets role = 'ADMIN' via Prisma, refusing to run when NODE_ENV=production unless `--i-know-this-is-prod` is passed, and printing which database host it is about to modify (host only, no credentials) with a y/N confirmation. Add an npm script `admin:promote`.
5. Document in docs/deploy-database.md: the alternative one-line SQL `UPDATE "User" SET role = 'ADMIN' WHERE email = '<email>';`.
6. Add tests for steps 2–3.

Acceptance: tests pass; promote-admin refuses without confirmation; nothing in the repo contains a real email, key or password.
```

---

## Prompt 6 — render.yaml, smoke test, and final audit

```
Part A: create deployment config.
1. `render.yaml` at the repo root with ONE web service `laptopmitra-api`: runtime node; envVars NODE_VERSION=22 and NODE_ENV=production; secrets with `sync: false` for DATABASE_URL, CORS_ORIGINS, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET; do NOT include FIREBASE_SERVICE_ACCOUNT_PATH; buildCommand `corepack enable && pnpm install --frozen-lockfile && pnpm --filter api exec prisma generate && pnpm --filter api build`; startCommand `pnpm --filter api exec prisma migrate deploy && node apps/api/dist/main`; healthCheckPath /health. No database block.
2. `scripts/smoke-test.sh` (bash, set -euo pipefail; args API_URL, WEB_URL, optional EVIL_ORIGIN) checking: /health is 200; GET /products is 200 JSON; unauthenticated POST /products is 401; a request with Origin=WEB_URL gets a matching Access-Control-Allow-Origin and one from EVIL_ORIGIN does not; /api is 404; WEB_URL is 200. PASS/FAIL per check, non-zero exit on failure, no secrets.
3. `docs/DEPLOY.md`: Vercel settings (Root Directory apps/web, install command `cd ../.. && pnpm install --frozen-lockfile`, Node 22, the NEXT_PUBLIC_ variables), Firebase Authorized domains step, and the deploy order from predeploy.md section 5. Link to predeploy.md instead of duplicating it.
4. Parse render.yaml with a YAML parser; run shellcheck on the script if available.

Part B: audit (report only, no code changes). Report PASS / FAIL / UNVERIFIED with file:line evidence for:
 a. clean-clone `pnpm install --frozen-lockfile`; single lockfile;
 b. `prisma generate`, `pnpm --filter api build`, `pnpm --filter api test`;
 c. `prisma migrate deploy` on an empty local DB, then migrate status clean;
 d. web `tsc --noEmit` and `pnpm build` with production-style variables;
 e. no secrets, `.env`, service-account JSON, dist, .turbo, .pnpm-store, .playwright-mcp tracked;
 f. every env var read by the API is in apps/api/.env.example and render.yaml; every NEXT_PUBLIC_ var is in apps/web/.env.example;
 g. no dummy Firebase values, no localhost or hardcoded rzp key reachable in a production web build;
 h. all mutating routes guarded; product writes ADMIN-only; webhook verifies the raw body;
 i. Swagger off in production; helmet, trust proxy, /health present;
 j. anything Critical or High in securityGaps.md still open.
End with go/no-go and the shortest must-fix list. Mark anything you could not run as UNVERIFIED.
```