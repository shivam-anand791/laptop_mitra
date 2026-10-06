# LaptopMitra Production Deployment Guide

This document outlines the hosting configuration for deploying LaptopMitra:
- **Backend API (`apps/api`)**: Deployed on [Render](https://render.com) using the root Blueprint [`render.yaml`](../render.yaml).
- **Web Frontend (`apps/web`)**: Deployed on [Vercel](https://vercel.com).
- **Database**: PostgreSQL (managed on Supabase, Neon, or Render).
- **Authentication**: Firebase Authentication.
- **Payments**: Razorpay.

For repo hygiene, database migration history, and initial configuration context, see [`predeploy.md`](../predeploy.md).

---

## 1. Vercel Project Settings (`apps/web`)

Configure the project in the Vercel dashboard:

| Setting | Value |
|---|---|
| **Framework Preset** | Next.js |
| **Root Directory** | `apps/web` *(Ensure "Include source files outside of the Root Directory in the Build Step" is enabled)* |
| **Build Command** | Next.js default (`next build`) |
| **Install Command** | `cd ../.. && pnpm install --frozen-lockfile` |
| **Node.js Version** | `22.x` |

### Required Environment Variables in Vercel

> [!IMPORTANT]
> All `NEXT_PUBLIC_*` variables are inlined into the client JavaScript bundle at **build time**. If you change any variable in Vercel, you **must trigger a redeploy** for the change to take effect.

| Variable Name | Production Description | Example Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Render API URL (HTTPS, no trailing slash) | `https://laptopmitra-api.onrender.com` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key ID | `rzp_live_...` (or `rzp_test_...`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `laptop-mitra.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID | `laptop-mitra` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | `laptop-mitra.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Sender ID | `123456789012` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web App ID | `1:123456789012:web:abcdef...` |
| `NEXT_PUBLIC_IMAGE_HOSTS` *(Optional)* | Allowed remote image hosts (comma-separated) | `images.unsplash.com,via.placeholder.com` |

*(Do NOT set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` in production).*

---

## 2. Render Project Settings (`apps/api`)

The API service is configured via [`render.yaml`](../render.yaml) at the repository root.

- **Service Name**: `laptopmitra-api`
- **Runtime**: `node` (Node.js 22)
- **Health Check Path**: `/health`
- **Build Command**: `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm --filter api exec prisma generate && pnpm --filter api build`
- **Start Command**: `pnpm --filter api exec prisma migrate deploy && node apps/api/dist/main`

Set the following secret environment variables in the Render dashboard (marked `sync: false` in `render.yaml`):
- `DATABASE_URL` (PostgreSQL pooled or direct connection string)
- `CORS_ORIGINS` (Comma-separated allowed origins, e.g. `https://laptopmitra.vercel.app,https://laptopmitra.com`)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (Multi-line PEM private key or literal with `\n`)
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

---

## 3. Firebase Authorized Domains

After the Vercel project is deployed:
1. Open the [Firebase Console](https://console.firebase.google.com).
2. Navigate to **Authentication** > **Settings** > **Authorized domains**.
3. Add your production frontend domain (e.g., `laptopmitra.vercel.app` and any custom apex/subdomains like `laptopmitra.com`).
4. Without this step, Firebase Auth will block sign-ins and identity tokens originating from your web application.

---

## 4. Deployment Order

For the full deployment schedule and verification rationale, follow [`predeploy.md` Section 5 (`Deploy order`)](../predeploy.md#5-deploy-order):

1. **Push & Merge**: Ensure all pre-launch fixes from `security/prelaunch-fixes` are pushed and merged into the production branch.
2. **Provision Database**: Create PostgreSQL instance; ensure `DATABASE_URL` is set in Render.
3. **Deploy Render API**: Deploy the `laptopmitra-api` service; verify `GET https://<api-host>/health` returns `{"status":"ok"}`.
4. **Seed Catalog**: Run one-time catalog seed with confirmation (see [`docs/deploy-database.md`](deploy-database.md)):
   ```bash
   pnpm --filter api exec prisma db seed
   ```
5. **Deploy Vercel Frontend**: Trigger the initial build with all `NEXT_PUBLIC_*` variables populated.
6. **Configure CORS & Firebase**: Set `CORS_ORIGINS` on Render to match your Vercel URL and add the URL to Firebase Authorized Domains. Redeploy API if needed.
7. **Bootstrap First Admin**: Use the CLI promotion tool or direct SQL (see [`docs/deploy-database.md`](deploy-database.md#4-admin-bootstrap)):
   ```bash
   pnpm --filter api run admin:promote <admin-email> --i-know-this-is-prod
   ```
8. **Configure Razorpay Webhook**: In Razorpay Dashboard > Webhooks, set endpoint URL to `https://<api-host>/payments/razorpay/webhook`, select payment and refund events, and enter the secret configured in `RAZORPAY_WEBHOOK_SECRET`.
9. **Execute Smoke Test**: Run the automated validation script against your live endpoints:
   ```bash
   ./scripts/smoke-test.sh https://<api-host> https://<web-host>
   ```
