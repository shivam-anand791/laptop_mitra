# Firebase Auth Setup & Environment Consistency Guide

This guide details the single-source-of-truth configuration for Firebase Authentication across Localhost, Vercel Preview/Production, and Native Mobile.

---

## 1. Environment Variable Matrix

| Scope | Variable Name | Purpose | Example / Format |
|---|---|---|---|
| **Web Client** (`apps/web/.env.local`, Vercel) | `NEXT_PUBLIC_FIREBASE_API_KEY` | Browser SDK API Key | `AIzaSy...` |
| | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth Domain | `laptop-mitra.firebaseapp.com` |
| | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Active Firebase Project | `laptop-mitra` or `laptop-mitra-dev` |
| | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage Bucket | `laptop-mitra.appspot.com` |
| | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID | `101...` |
| | `NEXT_PUBLIC_FIREBASE_APP_ID` | Web App ID | `1:101...:web:...` |
| | `NEXT_PUBLIC_API_URL` | Target Backend API URL | `http://localhost:3001` or Render URL |
| **Mobile Client** (`apps/mobile/.env`, EAS) | `EXPO_PUBLIC_FIREBASE_API_KEY` | Mobile SDK API Key | `AIzaSy...` |
| | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth Domain | `laptop-mitra.firebaseapp.com` |
| | `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Active Firebase Project | `laptop-mitra` or `laptop-mitra-dev` |
| | `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage Bucket | `laptop-mitra.appspot.com` |
| | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| Sender ID | `101...` |
| | `EXPO_PUBLIC_FIREBASE_APP_ID` | Mobile App ID | `1:101...:android:...` |
| | `EXPO_PUBLIC_API_URL` | Target Backend API URL | `https://laptopmitra-api.onrender.com` |
| **Backend API** (`apps/api/.env`, Render) | `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to JSON credentials file | `./secrets/firebase-service-account.json` |
| | `FIREBASE_PROJECT_ID` | Expected Project ID | `laptop-mitra` or `laptop-mitra-dev` |
| | `FIREBASE_CLIENT_EMAIL` | Direct env fallback (Render) | `firebase-adminsdk-...@...iam.gserviceaccount.com` |
| | `FIREBASE_PRIVATE_KEY` | Direct env fallback (Render) | `"-----BEGIN PRIVATE KEY-----\n..."` |
| | `CORS_ORIGINS` | Allowed Web Origins | `http://localhost:3000,http://127.0.0.1:3000,https://laptop-mitra.vercel.app` |

---

## 2. Environment Preflight: `pnpm doctor`

Before running the application or initiating builds, execute the environment doctor:

```bash
pnpm doctor
```

The preflight verifies:
1. All 6 required client variables exist for Web and Mobile without printing secret values.
2. The Backend API Firebase Admin credentials file or environment variables are valid.
3. The Web, Mobile, and API Firebase Project IDs strictly match within the active profile (`laptop-mitra` vs `laptop-mitra-dev`).
4. Rejects any token issued for a different Firebase project (`TOKEN_WRONG_PROJECT`).

---

## 3. Firebase Console Configuration Requirements

In [Firebase Console](https://console.firebase.google.com) under **Authentication ➔ Settings ➔ Authorized domains**, ensure the following domains are registered:

1. `localhost` (Local development)
2. `127.0.0.1` (Local development alternative)
3. `laptop-mitra.vercel.app` (Production web application)
4. Custom domain (e.g., `laptopmitra.com`, if attached)

> **Important**: Google sign-in is not implemented in the UI. Only **Email/Password** and **Anonymous** sign-in providers need to be enabled in Firebase Console.

---

## 4. Protected Database & Host Safety

The database safety guard strictly prohibits connection to protected production hosts outside of sanctioned production environments:
- `.db-protected-hosts` lists protected production PostgreSQL hosts.
- The API runtime verifies that non-production environments never target a protected host.
- Development requires a local Docker database (e.g. `DEV_DATABASE_NAME=laptopmitra_dev_fresh`).

---

## 5. Structured Error Reason Codes

The API returns explicit reason codes during authentication failures, and the client displays plain-language recovery notices:

| API Reason Code | User Message | Recovery Behavior |
|---|---|---|
| `DATABASE_UNAVAILABLE` | "The database is temporarily unavailable. Please try again in a few moments." | Exponential backoff retry; non-blocking recovery banner with Retry / Cancel buttons. |
| `TOKEN_WRONG_PROJECT` | "Authentication token was issued for a different environment. Please sign out and sign in again." | Immediate 401 without retry; prompts sign-out. |
| `TOKEN_EXPIRED` | "Your session has expired. Please sign in again." | Prompts refresh / re-authentication. |
| `FIREBASE_UNCONFIGURED` | "Authentication service is temporarily unavailable. Please try again shortly." | 503 service unavailable state. |

