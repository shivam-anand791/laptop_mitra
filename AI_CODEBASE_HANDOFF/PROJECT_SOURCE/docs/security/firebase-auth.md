# Firebase Authentication setup

Firebase Authentication is the identity provider for the web and Expo clients. The NestJS API verifies Firebase ID tokens with Firebase Admin and uses the verified UID to load the authoritative Prisma user row. The Prisma row owns profile, account status, and role data.

## Firebase Console

Use the same Firebase project for the web app, mobile app, and API. Enable the Email/Password and Anonymous sign-in providers to support the existing login, registration, and guest flows. Google sign-in is not implemented. Set the Firebase Authentication email action URL and authorized domains for the deployment; the password reset email uses Firebase's configured action handler. Email verification is not currently a sign-in requirement in the application.

Register web and mobile client apps in that project and copy their public configuration to the corresponding environment files. The mobile app uses Firebase JS SDK 12 or newer and stores Firebase Auth persistence through Expo SecureStore. Its local app scheme is `laptopmitra`.

## Environment

Web client public values go in `apps/web/.env.local` using `apps/web/.env.example` as a template. Mobile public values go in `apps/mobile/.env` using `apps/mobile/.env.example`. Firebase client API keys and app identifiers are public configuration, not authorization secrets.

The API requires Firebase Admin credentials at startup. For local use, point `FIREBASE_SERVICE_ACCOUNT_PATH` to a service account JSON file outside version control. For deployment, inject `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` through the platform's secret manager. Never prefix Admin credentials with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`. `FIREBASE_CHECK_REVOKED` defaults to `false` to avoid an extra lookup on ordinary requests; sensitive account deletion and signout-everywhere requests check revocation.

## API contract

Clients send `Authorization: Bearer <Firebase ID token>` to the configured LaptopMitra API origin. `POST /auth/sync` creates or synchronizes the local profile for a verified Firebase identity and may accept a Firebase identity that has no Prisma row yet. Other protected routes require the linked active Prisma user. Database roles remain authoritative.

The old `/auth/login`, `/auth/register`, `/auth/guest`, and `/auth/refresh` API routes remain as disabled compatibility endpoints. Current web and mobile clients do not call them; Firebase client SDKs perform sign-in, registration, anonymous sign-in, and token refresh. The `/auth/logout` endpoint remains a public no-op compatibility route; clients end their local session with Firebase SDK signout.
