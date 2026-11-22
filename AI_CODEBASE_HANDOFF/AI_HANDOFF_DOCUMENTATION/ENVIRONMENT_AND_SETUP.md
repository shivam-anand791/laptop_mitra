# LaptopMitra — AI Handoff: Environment & Setup

## 1. Prerequisites & Required Runtimes

Before running the project locally or in CI/CD, ensure the following software is installed:

- **Node.js**: Version `20.x` or `22.x` (Engine requirement: `>=18`).
- **pnpm**: Version `8.15.4` (Strict package manager; install via `npm install -g pnpm@8.15.4` or `corepack enable`).
- **PostgreSQL**: Version `14+` or `16` (Local Docker container or managed cloud instance on Supabase/Render/Neon).
- **Firebase Project**: An active Firebase project with Authentication enabled (Email/Password, Google OAuth).
- **Razorpay Account**: Razorpay Dashboard access with Sandbox/Test API keys (`rzp_test_...`).

---

## 2. Installation & Workspace Build

Clone the repository and install dependencies using `pnpm`:

```bash
# 1. Install all dependencies across all monorepo workspaces
pnpm install

# 2. Build shared packages in dependency order (MANDATORY step)
pnpm --filter "@laptopmitra/*" build
```

> [!IMPORTANT]
> The shared packages (`packages/types`, `packages/tokens`, `packages/api-client`, `packages/env`) generate distribution files in their respective `dist/` folders. If you alter any TypeScript type or design token, re-run `pnpm --filter "@laptopmitra/*" build`.

---

## 3. Database Initialization & Seeding

Database management is orchestrated through the guarded script `scripts/db-command.cjs`, which ensures that commands never execute against protected production database hosts.

```bash
# 1. Run migrations to generate tables
pnpm db:dev:migrate

# 2. Seed initial catalog, categories, products, and variants
pnpm db:dev:seed

# 3. (Optional) Seed sample orders, rental subscriptions, and test users
pnpm db:dev:seed-orders
pnpm db:dev:seed-rental
```

---

## 4. Local Development Startup

You can launch all applications concurrently via Turborepo or run specific targets in isolation:

### Concurrently (All Applications)
```bash
pnpm dev
```
Starts `apps/api` on port `3001`, `apps/web` on port `3000`, and the Expo mobile packager.

### Isolated Execution
```bash
# Backend NestJS API only (http://localhost:3001)
pnpm dev:api

# Next.js Web Client only (http://localhost:3000)
pnpm dev:web

# Expo Mobile Client only
pnpm --filter mobile start
```

---

## 5. Verification & Testing Commands

```bash
# Run all unit and component test suites across workspaces
pnpm test

# Run type check across all TypeScript packages
pnpm type-check

# Run linter across all packages
pnpm lint

# Run diagnostic environment doctor
pnpm doctor
```

---

## 6. Environment Variables Reference

### A. Backend API (`apps/api/.env`)

Create `apps/api/.env` by copying `apps/api/.env.example`:

| Variable Name | Required | Default / Example Value | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://user:pass@localhost:5432/laptopmitra?schema=public` | PostgreSQL connection string |
| `PORT` | No | `3001` | HTTP port for NestJS server |
| `NODE_ENV` | Yes | `development` | Runtime environment (`development`, `test`, `production`) |
| `CORS_ORIGINS` | Yes | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated list of allowed web origins |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Dev | `./secrets/firebase-service-account.json` | Path to Firebase Admin service account JSON |
| `FIREBASE_PROJECT_ID` | Prod | `your-firebase-project-id` | Firebase project ID (alternative to service account file) |
| `FIREBASE_CLIENT_EMAIL` | Prod | `firebase-adminsdk@...iam.gserviceaccount.com` | Firebase client email |
| `FIREBASE_PRIVATE_KEY` | Prod | `"-----BEGIN PRIVATE KEY-----\n..."` | Firebase private key |
| `RAZORPAY_KEY_ID` | Yes | `rzp_test_xxxxxxxxxxxx` | Razorpay Key ID (must be `rzp_test_` in non-prod) |
| `RAZORPAY_KEY_SECRET` | Yes | `xxxxxxxxxxxxxxxxxxxxxxxx` | Razorpay Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | `replace-with-webhook-secret` | Webhook verification secret from Razorpay dashboard |
| `ALLOW_LIVE_PAYMENT_KEYS`| No | `false` | Hard stop: must be true AND production to use live keys |
| `PAYMENT_ENCRYPTION_KEY` | Yes | `64-character-hex-string` | 32-byte hex key for AES-256-GCM encryption of bank details |
| `MAIL_DRIVER` | No | `console` | Email driver (`console`, `smtp`, `resend`) |
| `RESEND_API_KEY` | If Resend | `re_xxxxxxxxxxxx` | Resend API key |
| `SMTP_HOST` | If SMTP | `smtp.example.com` | SMTP host |
| `SMTP_PORT` | If SMTP | `587` | SMTP port |
| `SMTP_USER` | If SMTP | `user@example.com` | SMTP username |
| `SMTP_PASS` | If SMTP | `smtp-password` | SMTP password |
| `ENABLE_SWAGGER` | No | `true` in dev | Enables OpenAPI documentation on `/api` |

### B. Web Frontend (`apps/web/.env.local`)

Create `apps/web/.env.local` by copying `apps/web/.env.example`:

| Variable Name | Required | Default / Example Value | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:3001` | Public URL of the NestJS backend API |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes | `rzp_test_placeholder` | Client-safe Razorpay Key ID |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | `AIzaSy...` | Firebase web client API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | `laptopmitra.firebaseapp.com` | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | `laptopmitra` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`| Yes | `laptopmitra.firebasestorage.app` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| Yes | `123456789012` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | `1:123456789012:web:abcdef` | Firebase web application ID |
| `NEXT_PUBLIC_IMAGE_HOSTS` | No | `images.unsplash.com,via.placeholder.com` | Allowed domains for Next.js image optimization |

### C. Mobile Application (`apps/mobile/.env`)

Create `apps/mobile/.env` by copying `apps/mobile/.env.example`:

| Variable Name | Required | Default / Example Value | Description |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | Yes | `http://10.0.2.2:3001` (Android Emulator) / `http://localhost:3001` (iOS Simulator) | Backend API endpoint |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Yes | `AIzaSy...` | Firebase client API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | `laptopmitra.firebaseapp.com` | Firebase Auth domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Yes | `laptopmitra` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`| Yes | `laptopmitra.firebasestorage.app` | Firebase storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| Yes | `123456789012` | Firebase sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Yes | `1:123456789012:android:abcdef` | Firebase mobile application ID |

---

## 7. Production Deployment Overview

- **Backend API (`apps/api`)**: Hosted on [Render](https://render.com) using `render.yaml`. Built with `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm --filter api exec prisma generate && pnpm --filter api build`. Started via `node apps/api/dist/main`. Healthcheck endpoint is `/health`.
- **Web Frontend (`apps/web`)**: Hosted on [Vercel](https://vercel.com). Root directory set to `apps/web` with "Include files outside root" enabled. Install command: `cd ../.. && pnpm install --frozen-lockfile`. Built via `next build`.
- **Mobile App (`apps/mobile`)**: Built for Android (AAB/APK) and iOS (IPA) via Expo Application Services (EAS Build) using profiles in `eas.json`.
