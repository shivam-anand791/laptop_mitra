# Future Scope & Action Items Before Final Deployment

> **Status:** Pending Owner Action / Pre-Deployment Checklist  
> **Target Release:** Laptop Mitra Production (Web, Mobile, Admin & API)  
> **Repository Baseline:** Monorepo passing 8/8 Turbo packages, 105 Web tests, 17 Mobile tests, 461 API tests across 37 test suites.

---

## 1. Executive Summary

During the local development synchronization, audit, and checkout enhancement phases (Stages 1–4 and Shipping & Affiliate Upgrades):
- The core contract mismatches, identity reconciliation, server-side tab counts (`/orders/counts`), visibility-aware 60s polling, date of birth persistence, and cross-session customer/admin workflows were resolved and tested.
- **Pincode Verification:** Automated India Post postal directory verification with in-memory caching and fallback offline prefix directory was integrated for checkout and saved addresses.
- **Delhi NCR COD Restriction:** Cash on Delivery was strictly restricted to Delhi NCR (Delhi, Gurugram, Faridabad, Noida, Ghaziabad, Sonipat, Bahadurgarh) across both frontend UI and backend order creation guards.
- **Mitra Affiliate Code Generation:** Standardized affiliate referral code format (`mitra` + 4-char username slug + 4 random numeric digits) with database collision checks and preservation of existing affiliate accounts.

Before triggering the final production deployment across Vercel (Web), Cloud Hosting (API), Supabase (Database), and Expo EAS (Mobile), the following external integrations, environment configurations, and verification gates must be addressed.

---

## 2. External Service Integrations (Owner Action Items)

These items rely on third-party production credentials and live endpoints that cannot be verified in an isolated local database:

### A. Razorpay Payment Gateway & Live Webhooks
- [ ] **Live Keys & Webhook Secret:** Configure production `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in the cloud API runtime.
- [ ] **Webhook Signature Verification:** Verify that the production webhook handler strictly validates HMAC-SHA256 signatures before updating payment states to `PAID` or `REFUNDED`.
- [ ] **Automated Bank Gateway Refunds:** Test real-world reverse payout / refund flow via Razorpay API when an admin approves a return with an automated UTR response.
- [ ] **Idempotency Guard:** Ensure duplicate webhook deliveries (retried by Razorpay) do not trigger double-crediting or duplicate stock restoration.

### B. Transactional Email Delivery (Resend / SMTP)
- [ ] **Production Mail Service:** Configure authenticated production credentials (e.g., Resend API key or secure SMTP) in cloud API environment variables.
- [ ] **Domain Verification & SPF/DKIM:** Validate DNS TXT records (`SPF`, `DKIM`, `DMARC`) for `laptopmitra.com` to prevent transactional emails from landing in spam.
- [ ] **Live Email Deliverability Tests:** Verify physical delivery of:
  - Account email verification links (`/verify-email?token=...`).
  - Order confirmation & invoice attachment emails.
  - Return approval and refund processing receipts.
  - Support ticket customer notification alerts.

### C. Native Mobile Push Notifications (FCM / APNs)
- [ ] **Firebase Cloud Messaging (FCM):** Upload production Android service account credentials and configure Expo EAS Push credentials.
- [ ] **Apple Push Notification Service (APNs):** Register Apple developer certificates/keys for iOS builds.
- [ ] **Device Push Delivery Test:** Test push token registration upon mobile login (`POST /notifications/token`) and confirm background delivery on physical Android and iOS hardware.

### D. Outbound Postal Verification Network Access
- [ ] **India Post API Access:** Ensure cloud API hosting egress firewall allows outbound HTTPS requests to `https://api.postalpincode.in` on port 443 without IP blocking.

---

## 3. Database & Schema Verification Gates

> [!IMPORTANT]
> **Standing Rule:** Never run database schema migrations or alter production tables without explicit written approval.

- [ ] **Production Schema Parity Audit:** Perform a read-only audit of production Supabase PostgreSQL tables against dev schema:
  - Verify presence and type of `User.dob` (Timestamp/Date).
  - Verify presence and uniqueness of `User.referralCode` (String @unique).
  - Check constraints on `OrderItem.configuration` (`'default' | 'ram-16gb'`).
  - Confirm sequence generators (`ticket_seq`, `return_seq`) are present and healthy.
- [ ] **Customer Row Integrity:** Ensure no duplicate user records exist for the same verified email before migrating or re-syncing authentication providers.
- [ ] **Database Connection Pooling:** Verify production connection pool limits (Supabase connection pooler in transaction mode) to prevent exhausted connections under concurrent load.

---

## 4. Environment Variables & Security Audits

Verify that each production deployment target has all required secrets configured with zero local leaks:

### A. API Backend (`apps/api`)
- [ ] `DATABASE_URL` (Targeting production Supabase pooler with SSL mode `require`).
- [ ] `APP_PUBLIC_URL` (Strict HTTPS origin: `https://api.laptopmitra.com`).
- [ ] `WEB_APP_URL` / `CORS_ORIGINS` (Restricted to authoritative web domains, e.g., `https://laptopmitra.com` and admin origin).
- [ ] `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (Production Firebase credentials).
- [ ] `JWT_SECRET` / Session encryption secrets.

### B. Web App (`apps/web`)
- [ ] `NEXT_PUBLIC_API_URL` pointing to production API origin.
- [ ] `NEXT_PUBLIC_FIREBASE_*` configuration pointing to production client config.
- [ ] Verify that no server-only environment variables are prefixed with `NEXT_PUBLIC_`.

### C. Mobile App (`apps/mobile`)
- [ ] Production API URL configured in `eas.json` build profiles (`preview`, `production`).
- [ ] Ensure `app.json` / `app.config.ts` version code, permissions, and bundle identifiers match app store requirements.
- [ ] Verify zero Node.js runtime imports (`fs`, `crypto`, `path`) in Metro production bundle.

---

## 5. Client & UI Quality Checklist

- [ ] **Real-Time Pincode Verification:** Customer checkout dynamically validates Indian pincodes, shows detected City & State, and flags non-serviceable locations.
- [ ] **Delhi NCR COD Restriction:** Cash on Delivery radio option is strictly restricted to Delhi NCR locations with a clear badge; outside NCR, it displays explanatory guidance and preserves prepaid online payment options.
- [ ] **Mitra Referral Format:** Newly registered affiliates automatically receive codes matching `mitra` + 4-char username slug + 4 digits (e.g. `mitrashiv4827`); existing affiliate referral links remain functional.
- [ ] **Zero Synthetic Tracking Steps:** Confirm the customer tracking view renders only real events (`PLACED` ➔ `CONFIRMED` ➔ `SHIPPING` ➔ `DELIVERED`).
- [ ] **No Hardcoded Values:** Confirm warranty displays dynamic invoice-backed dates rather than generic "1-Year" strings.
- [ ] **Honest Notification Settings:** Maintain the exclusion of SMS/WhatsApp toggles in customer settings until SMS gateway integration is contracted and deployed.
- [ ] **Visibility-Aware Polling:** Monitor client CPU and network overhead for the 60-second polling interval on in-progress orders when active in background tabs.
- [ ] **Invoice PDF Download:** Validate PDF invoice generation endpoint performance and ensure CDN caching headers protect customer privacy.

---

## 6. Pre-Cutover Verification Protocol

Immediately following deployment to staging or canary environments:

1. **Dual-Session Smoke Test:**
   - Execute a live order placement as a real customer account (both COD in Delhi NCR and prepaid Razorpay outside NCR).
   - Process the order inside the live Admin Dashboard (Confirm ➔ Add Tracking ➔ Mark Delivered).
   - Confirm customer UI updates without hard refreshes.
2. **Mitra Affiliate Balance Concurrency:**
   - Test simultaneous payout requests to ensure PostgreSQL row locks (`FOR UPDATE`) strictly prevent negative or double-drawn balances.
3. **Sign-Out Everywhere Verification:**
   - Ensure revoking tokens from `/account/security` successfully logs out all active web and mobile sessions.
4. **Log & Sentry Monitoring:**
   - Confirm that customer PII (phone numbers, emails, addresses) is masked in application logs and error reporting pipelines.

---

## 7. Current Verification Baseline

*Recorded as of November 2026 pre-deployment sync:*

| Test Suite / Package | Scope | Result | Status |
| :--- | :--- | :--- | :--- |
| **Turborepo Workspace** | All 8 packages (`web`, `mobile`, `api`, `types`, `tokens`, `api-client`, `config`, `env`) | 8 / 8 passed | Clean |
| **Web App Unit Tests** | Component logic, admin guards, account helpers, redirect sanitizers | 105 passed, 0 failed (28 suites) | Clean |
| **Mobile App Unit Tests** | Domain logic, plain language formatters, order eligibility rules | 17 passed, 0 failed (1 suite) | Clean |
| **API Unit & Security Tests** | Role enforcement, order controllers, return limits, affiliate locks, pincode verification, affiliate code generation | 461 passed, 0 failed (37 suites) | Clean |

---

*Pending verification: Production canary cutover and physical mobile device verification.*
