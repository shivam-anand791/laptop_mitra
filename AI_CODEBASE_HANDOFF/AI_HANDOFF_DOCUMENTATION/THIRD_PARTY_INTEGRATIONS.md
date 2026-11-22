# LaptopMitra — AI Handoff: Third-Party Integrations

## 1. Firebase Authentication & Cloud Services

LaptopMitra relies on Firebase as its managed identity provider and push notification bridge.

- **Client SDKs**: `firebase` (`^12.19.0`) used in Next.js web (`apps/web/lib/firebase.ts`) and React Native mobile (`apps/mobile/src/firebase/firebase.ts`).
- **Server SDK**: `firebase-admin` (`^13.10.0`) initialized in `apps/api/src/firebase/firebase.service.ts`.
- **Supported Auth Providers**:
  - Email & Password with custom email verification challenges.
  - Google OAuth (Web popup/redirect and native mobile OAuth).
  - Anonymous / Guest sessions.
- **Server Verification Flow**:
  - `verifyIdToken(token, checkRevoked)` validates JWT expiration, cryptographic signatures against Google's public x509 certs, and project audience (`aud`).
- **Push Notifications (FCM / Expo)**:
  - Mobile registers Expo push tokens via `POST /notifications/register`. Tokens are stored in the `DeviceToken` table and dispatched through Firebase Cloud Messaging / Expo Push API.

---

## 2. Razorpay Payment Gateway

Razorpay powers all financial transactions across web and mobile.

### Integration Scope
1. **Standard Orders (Direct Purchases)**:
   - Backend calls `razorpay.orders.create({ amount: amountPaise, currency: 'INR', receipt: orderNumber })`.
   - Web loads Razorpay standard checkout script (`https://checkout.razorpay.com/v1/checkout.js`).
   - Mobile uses `react-native-razorpay` native bridge module.
2. **Rental Subscriptions**:
   - Uses Razorpay Subscriptions API for recurring automated monthly card/UPI mandates.
   - Subscription verify endpoint validates `razorpay_subscription_id` and initial authorization token.
3. **Refunds**:
   - Backend triggers automated partial or full refunds through `razorpay.payments.refund(paymentId, { amount: amountPaise, notes })` upon order cancellation or approved returns.
4. **Webhook Verification**:
   - Mounted at `POST /payments/razorpay/webhook`.
   - The webhook signature is computed using HMAC-SHA256 (`crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex')`) and compared in constant time against `x-razorpay-signature`.
   - Idempotency is enforced through `NotificationDedupeLog` to prevent duplicate processing of retransmitted webhooks.

### Safety Guards (`apps/api/src/modules/payments/payment.service.ts`)
- The backend actively inspects `RAZORPAY_KEY_ID`. If a live key (`rzp_live_...`) is detected outside production or without `ALLOW_LIVE_PAYMENT_KEYS=true`, the process terminates immediately at startup.

---

## 3. Transactional Email System

Implemented in `apps/api/src/modules/mail/mail.service.ts` with a multi-driver architecture:

| Driver | Configuration Key | Usage Environment | Description |
|---|---|---|---|
| **Console** | `MAIL_DRIVER=console` | Local Development | Prints formatted email payloads and OTP codes directly to terminal logs. |
| **Resend** | `MAIL_DRIVER=resend` | Staging / Production | High-deliverability transactional emails via Resend HTTP API (`resend` SDK). |
| **SMTP** | `MAIL_DRIVER=smtp` | Self-hosted / Custom | Sends emails via standard TLS SMTP using `nodemailer`. |

### Automated Email Triggers:
- Account OTP email verification and password reset.
- Order confirmation with invoice PDF attachment.
- Order cancellation and refund initiation confirmation.
- Doorstep technician service booking confirmation.
- Mitra affiliate commission notifications.

---

## 4. Cloud Object Storage (QR Codes & Media)

Configured via `apps/api/src/common/storage/` with support for:
- **Cloudinary**: Primary cloud image asset hosting (`cloudinary` SDK).
- **Amazon S3**: Compatible with AWS S3, Cloudflare R2, or MinIO for private KYC documents and payment QR code uploads.
- **Local Disk Fallback**: Dev-only storage rejected in production by runtime environment validation rules.

---

## 5. Indian Logistics & Pincode Serviceability

Implemented in `apps/api/src/modules/shipping/pincode.service.ts`:
- Validates 6-digit Indian Postal PIN codes against serviceable delivery zones.
- Determines estimated delivery transit time (e.g. 2–3 days for Tier 1 metros, 4–7 days for non-metro regions).
- Determines Cash on Delivery (COD) eligibility based on product price and regional delivery courier partners (Delhivery, BlueDart, DTDC).
