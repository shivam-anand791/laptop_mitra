# LaptopMitra — Pre-Deploy Checklist (Vercel web + Render API + Firebase Auth)

Repo: `shivam-anand791/laptop_mitra`, branch **`security/prelaunch-fixes`** (commit `15bdfe2`, 5 Oct 2026). `main` is still the older JWT version, so deploy from this branch or merge it first.
Stack: `apps/web` (Next.js 16) on **Vercel**, `apps/api` (NestJS 11 + Prisma 6 + `firebase-admin`) on **Render**, PostgreSQL, Firebase Authentication, Razorpay (test keys).

> **What I verified.** I read the branch code. `pnpm install --frozen-lockfile` succeeds and `tsc --noEmit` passes for `apps/web`. I could **not** run the API build/start (Prisma engine download is blocked in my sandbox) or a full `next build` (Google Fonts blocked), and I did not test any live Firebase or Razorpay flow. Run the commands in section 7 yourself.
> This replaces my earlier checklist, which was based on `main`.

---

## 1. Already fixed on this branch (no action needed)

- Firebase Admin token verification as a global guard; `@Public()` routes (e.g. `/health`) excluded.
- Product create/update/delete restricted to `ADMIN`.
- Razorpay order amount and ownership validated server-side; payment-signature check uses `timingSafeEqual`.
- `helmet`, `trust proxy`, `0.0.0.0` listen, `PORT` from env.
- CORS allow-list that **fails closed** in production (`CORS_ORIGINS` is required, unknown origins rejected).
- `GET /health` exists.
- Web `lib/api.ts` no longer falls back to mock data.
- Schema is PostgreSQL and the API `.env.example` uses `postgresql://`.
- No service-account key or real secret is committed (the only `PRIVATE_KEY` strings are placeholders and a fake test fixture).

---

## 2. Blockers (deploy will fail or misbehave without these)

### B1. The migrations cannot build a fresh database
`apps/api/prisma/migrations/` contains one migration, `20261003180000_firebase_auth`, which only `ALTER`s/`DROP`s things (`RefreshToken`, `OtpAttempt`, `User.password`…). It contains no `CREATE TABLE`. On an empty Render database, `prisma migrate deploy` fails on the first statement because those tables don't exist.
**Fix:** since no production database exists yet, replace it with one baseline migration generated from the current schema (Prompt 2).

### B2. Razorpay webhook still verifies the wrong bytes
`payment.service.ts` `handlePaymentWebhook` signs `JSON.stringify(payload)` (the re-serialised body); Razorpay signs the **raw** body. `main.ts` does not enable `rawBody`. Valid webhooks will be rejected, and an invalid one still gets HTTP 200 (`{ valid:false }`), so Razorpay will not retry.
**Fix:** `NestFactory.create(AppModule, { rawBody: true })`, verify against `req.rawBody`, return 400 on a bad signature (Prompt 3). The client-side `razorpay/verify` flow is already correct, so checkout can work without the webhook; the webhook matters for payments that complete after the user closes the tab.

### B3. Web app has silent dummy fallbacks for production config
- `apps/web/lib/firebase.ts`: every `NEXT_PUBLIC_FIREBASE_*` value falls back to a dummy (`AIzaSyDemoDummyKey…`, `laptop-mitra`, `1234567890`…). If a variable is missing on Vercel, sign-in fails with confusing Firebase errors instead of a clear build error.
- `apps/web/lib/api.ts`: `NEXT_PUBLIC_API_URL` falls back to `http://localhost:3001`.
- `apps/web/app/checkout/page.tsx` line ~147: hardcoded fallback Razorpay key id `rzp_test_S3Keo…`.
- There is no `apps/web/.env.example`.
`NEXT_PUBLIC_*` values are baked in at build time, so a wrong value means a redeploy.
**Fix:** require them in production builds (Prompt 4).

### B4. Render must use the env-var form of the Firebase credentials
Locally you use `FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/…json`. That file is git-ignored, so it won't exist on Render, and if the variable is set the code looks for the file and aborts startup. In production leave `FIREBASE_SERVICE_ACCOUNT_PATH` **unset** and set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (the code accepts the key with `\n` escapes or real newlines).

### B5. Firebase console must allow the live domain
Add your Vercel domain (and any custom domain) under Authentication → Settings → **Authorized domains**, or sign-in popups/redirects fail on the live site. If guest login uses Firebase anonymous sign-in, that provider must also be enabled in the console.

### B6. No way to create the first admin
New users get role `CUSTOMER` (`GUEST` for guests) and I found no admin bootstrap. After you register on the live site, promote yourself once in SQL:
`UPDATE "User" SET role = 'ADMIN' WHERE email = '<your email>';`

### B7. Repo cleanup is only local so far
Your agent's Prompt 1 run (untracking `dist`/`.turbo`/`.pnpm-store`, deleting `package-lock.json`, nested lockfiles, `apps/apps/`, the root `prisma/schema.prisma`) is not on GitHub yet. On the branch today: 212 tracked `dist` files, 50 tracked `.playwright-mcp` files, a root `package-lock.json`, three nested `pnpm-lock.yaml`/`pnpm-workspace.yaml` pairs, and `apps/apps/web`. The deletion of the root schema is correct on this branch (it is the old JWT schema). Commit and push it, and also untrack `.playwright-mcp` and add it to `.gitignore`.

---

## 3. Should-fix

| # | Issue | Fix |
|---|---|---|
| S1 | Swagger UI is public at `/api` | Mount only when `NODE_ENV !== 'production'` or `ENABLE_SWAGGER=true` |
| S2 | `apps/api/.env.example` lacks `RAZORPAY_WEBHOOK_SECRET` and lists SMTP variables that nothing in `src` reads | Add the former, remove or comment the latter |
| S3 | `FIREBASE_CHECK_REVOKED` defaults to true in production, so every request makes an extra Firebase call | Fine for launch; set `false` only if you see latency |
| S4 | `next.config.ts` allows images from any https host | Restrict to your real image hosts |
| S5 | Seed (`seed-catalog.ts`) inserts product images with `create()` | Re-running may duplicate image rows; run it once or make it idempotent |
| S6 | Root `.env.example` (MySQL/JWT template, if unchanged) | Delete or label as unused so nobody copies it |
| S7 | Health endpoint returns service name/version | Harmless; trim if you prefer |

---

## 4. Platform settings

### Render: Web Service (API)
| Setting | Value |
|---|---|
| Node | `NODE_VERSION=22` (matches `.nvmrc`) |
| Root directory | repo root |
| Build command | `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm --filter api exec prisma generate && pnpm --filter api build` |
| Start command | `pnpm --filter api exec prisma migrate deploy && node apps/api/dist/main` |
| Health check path | `/health` |
| Instance | Free web services spin down when idle and cold-start on the next request; use a paid instance for customer traffic |

(I put `migrate deploy` in the start command instead of a pre-deploy command so it works on any instance type.)

| Env var | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://…` (use the internal URL for a Render DB in the same region; add `?sslmode=require` for external hosts) |
| `CORS_ORIGINS` | exact web origin(s), comma-separated, no trailing slash, e.g. `https://laptop-mitra.vercel.app` |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | from your Firebase service-account JSON |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | **do not set** |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | `rzp_test_…` |
| `RAZORPAY_WEBHOOK_SECRET` | same string as in the Razorpay dashboard |
| `PORT` | do not set; Render injects it |

### Vercel: Project (web)
| Setting | Value |
|---|---|
| Root Directory | `apps/web` (keep "include source files outside the Root Directory" on) |
| Install command | `cd ../.. && pnpm install --frozen-lockfile` |
| Node | 22.x |

| Env var (Production) | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<service>.onrender.com` (https, no trailing slash) |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID` | from Firebase console → Project settings → Your apps (web) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | `rzp_test_…` key id |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` / emulator host | do not set |

Preview deployments have changing URLs; they will fail CORS and Firebase authorized-domain checks unless you add them. Test on the production URL.

---

## 5. Deploy order

1. Finish Prompts 1–4 below, push to the branch, merge into `main` (or set the Vercel/Render production branch to this branch).
2. Create the Postgres database. Back it up/snapshot before the first migrate if it will hold real data.
3. Deploy the Render API; check `GET https://<api>/health`.
4. Seed once (manual, with your confirmation, `DATABASE_URL` pointing at the new DB): `pnpm --filter api exec prisma db seed`.
5. Deploy Vercel with all `NEXT_PUBLIC_*` variables set.
6. Put the final Vercel origin in Render `CORS_ORIGINS`; add the domain to Firebase Authorized domains; redeploy the API.
7. Register on the live site, run the admin SQL (B6), check `/admin`.
8. Razorpay dashboard: webhook `https://<api>/payments/razorpay/webhook` with the secret from Render; send a test event.

---

## 6. Rollback

- Render: redeploy the previous successful deploy. Vercel: promote the previous deployment.
- Migrations are forward-only; keep each one compatible with the previous code for one release.
- Never reuse development secrets, and keep Razorpay on `rzp_test_` keys until the payment flow is tested end to end.

---

## 7. Verification commands

```bash
pnpm install --frozen-lockfile
pnpm --filter api exec prisma generate
pnpm --filter api build && pnpm --filter api test     # dist/main.js must exist
cd apps/web && pnpm exec tsc --noEmit && pnpm build

# Fresh-database test (local Postgres only)
pnpm --filter api exec prisma migrate deploy

# After deploy
curl -i https://<api>/health
curl -s https://<api>/products | head -c 300
curl -i -X POST https://<api>/products -H 'Content-Type: application/json' -d '{}'   # 401
curl -i https://<api>/products -H 'Origin: https://evil.example'                      # no Access-Control-Allow-Origin
curl -i https://<api>/api                                                              # 404 once S1 is done
```
Browser checks on the Vercel URL: Network tab shows calls to `onrender.com`; sign up and sign in with Firebase; add to cart; checkout opens Razorpay test mode; a normal user is rejected on admin routes.