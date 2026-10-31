# API Setup

## Firebase Authentication

Create or select the `laptop-mitra` Firebase project and enable the sign-in providers used by the clients. The API verifies Firebase ID tokens from `Authorization: Bearer <token>` and links each Firebase UID to a local user through `POST /auth/sync`.

For local development, place the service account file at `apps/api/secrets/firebase-service-account.json` and configure:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/firebase-service-account.json
```

For deployments, configure `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` as environment secrets instead. Store the private key with escaped `\n` line breaks; the API converts them when initializing Firebase Admin. Set `FIREBASE_CHECK_REVOKED` to `true` or `false` to override revocation checks. It defaults to enabled in production.

The service-account path and Firebase service-account JSON patterns are ignored by Git. Never commit the key. Firebase credentials are required at API startup; startup fails if neither credential form is valid.

Firebase handles login, registration, password reset, token refresh, anonymous sign-in, and sign-out. After a client signs in, it sends the Firebase ID token to `POST /auth/sync`; the API returns the local user profile. Local roles remain authoritative in the database.

## Admin bootstrap

`ADMIN` is the highest role supported by the application; there is no `SUPER_ADMIN` role. User sync preserves existing roles and only converts an existing `GUEST` role to `CUSTOMER` when a guest account is linked to a real sign-in.

To bootstrap the designated administrator, configure `BOOTSTRAP_ADMIN_UID` and `BOOTSTRAP_ADMIN_EMAIL` in the target environment, then run `pnpm --filter api admin:bootstrap`. The script only updates an existing active account whose Firebase UID and email match, and only after Firebase Auth and the database both report the email verified. It is idempotent and does not create users. Development runs are restricted to the configured development database. For Render `preview`, `staging`, or `production`, run `pnpm --filter api admin:bootstrap -- --confirm-production` (replace `production` with the selected environment); the database safety checks still apply. Do not configure the identity in environments where it should not receive admin access.

## Branded email verification

Registration sends a verification email through `POST /auth/email-verification`. The endpoint requires a Firebase ID token, derives the recipient from the verified token UID, and uses Firebase Admin to create the action code. The web page at `/verify-email` applies the code with Firebase Client Auth, refreshes the ID token, then synchronizes the updated verification status.

Configure `MAIL_DRIVER=smtp`, `ALLOW_REAL_EMAILS=true`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and `APP_PUBLIC_URL`. Set `SMTP_FROM` to a sender address verified by your SMTP provider. `APP_PUBLIC_URL` must be exactly the web app origin (for example `http://localhost:3000` locally and the HTTPS staging or production origin in deployment); it must not include a path or query string. SMTP settings are deployment secrets/configuration and must not be committed.

In Firebase Console, add each web origin used for verification to Authentication's authorized domains. Use the same Firebase project in the web client and API. Firebase Admin rejects unapproved continue URLs; the API only accepts the configured origin and always builds the fixed `/verify-email` route, so the client cannot supply a redirect target.
