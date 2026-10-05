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