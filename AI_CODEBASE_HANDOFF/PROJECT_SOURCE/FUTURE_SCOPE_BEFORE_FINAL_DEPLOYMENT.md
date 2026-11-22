# Future Scope & Action Items Before Final Deployment

> **Status:** Pending Owner Action / Pre-Deployment Checklist  
> **Target Release:** Laptop Mitra Production (Web, Mobile, Admin & API)  
> **Repository Baseline:** Monorepo passing 8/8 Turbo packages, 145 Web tests across 49 suites, 47 Mobile tests across 4 suites, 596 API tests across 46 test suites.

---

## 1. Executive Summary

During the local development synchronization, audit, checkout enhancement, and situation-aware support phases:
- **Core Parity & Security:** Identity reconciliation, server-side tab counts (`/orders/counts`), visibility-aware polling, date of birth persistence, and cross-session customer/admin workflows were resolved and tested.
- **Pincode Verification:** Automated India Post postal directory verification with in-memory caching and fallback offline prefix directory was integrated for checkout and saved addresses.
- **Delhi NCR COD Restriction:** Cash on Delivery was strictly restricted to Delhi NCR (Delhi, Gurugram, Faridabad, Noida, Ghaziabad, Sonipat, Bahadurgarh) across web and mobile frontend UI and backend order creation guards.
- **Mitra Affiliate Code Generation:** Standardized affiliate referral code format (`mitra` + 4-char username slug + 4 random numeric digits) with database collision checks and preservation of existing affiliate accounts.
- **Complete Coupon & Promo Code System:** Proportional line discount allocation with zero remainder drift, atomic consumption with row-level locks, soft archiving without hard deletes, online-only vs COD restrictions, and customer offers sheets across web and mobile.
- **Situation-Aware "Need Help" Architecture:** Single server-side rules engine evaluating real-time order item situations (before dispatch, in transit, delivered inside 7-day return window, in warranty, outright vs lease, buyback-eligible) with plain-language `disabledReason` explanations across web and mobile.
- **Order Change Requests (Proposal A):** Pre-dispatch customer requests for delivery address (6-digit PIN) or phone number (10-digit mobile) modification with admin review queue, diff modal, and idempotent application.
- **Assured Buyback Guarantee Engine (Proposal D'):** Database-backed 6-tier schedule (0–6 mo: 70%, 6–12 mo: 60%, 12–18 mo: 50%, 18–24 mo: 40%, 24–30 mo: 30%, 30–36 mo: 20%), upper bound inclusive boundary rule, 15-day quote validity lock, 4-point hardware checklist + 70% min battery, encrypted bank/UPI payouts, and free return shipments if inspection offer is declined.
- **Corporate Profiles & Staff Notes (Proposal C'):** Admin-managed corporate profile (GSTIN format validation, billing address, contact person, priority client flag) with database-level ticket queue ordering and append-only staff client notes.
- **Item-Level Pre-Dispatch Cancellation (Proposal E):** Customer self-serve and admin cancellation for individual items on multi-item orders prior to dispatch. Automatically reverses proportional coupon discount without disturbing remaining active items, restores item inventory, triggers prepaid refund or recalculates COD balance, records immutable `OrderItemCancellation` audit logs, and transitions the whole order to `CANCELLED` if the cancelled item was the last active item.
- **Lease Contract & Installment Tracking Engine (Proposal B'):** Individual `LeaseContract` created per leased item with sequential numbering (`LM-LC-XXXXXX`), validated tenures (6, 12, or 24 months), calendar installment schedule generation with month-1 advance marked `PAID` at checkout, customer buyout quotes with configurable 15-day validity, admin buyout completion with waiver of pending installments, and immutable append-only `LeaseEvent` ledger.

Before triggering the final production deployment across Vercel (Web), Cloud Hosting (API), Supabase (Database), and Expo EAS (Mobile), the following external integrations, deferred commerce capabilities, environment configurations, and verification gates must be addressed.

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
  - Buyback quote issuance and payout receipts.

### C. Native Mobile Push Notifications (FCM / APNs)
- [ ] **Firebase Cloud Messaging (FCM):** Upload production Android service account credentials and configure Expo EAS Push credentials.
- [ ] **Apple Push Notification Service (APNs):** Register Apple developer certificates/keys for iOS builds.
- [ ] **Device Push Delivery Test:** Test push token registration upon mobile login (`POST /notifications/token`) and confirm background delivery on physical Android and iOS hardware.

### D. Outbound Postal Verification Network Access
- [ ] **India Post API Access:** Ensure cloud API hosting egress firewall allows outbound HTTPS requests to `https://api.postalpincode.in` on port 443 without IP blocking.

---

## 3. Future Scope & Deferred Commerce Features

The following features were intentionally scoped out during current development phases per client architecture decisions and can be scheduled for future milestone releases:

### A. Bank & Card Gateway Level Offers (Card BIN Integration)
- **Scope:** Real-time bank discounts (e.g., *"HDFC Bank 10% Instant Discount"*, *"ICICI Credit Card ₹2,000 Off"*).
- **Why Deferred:** Requires gateway-level card BIN callbacks during checkout so that card details entered in the payment gateway iframe dynamically trigger gateway-side instant discounts or merchant refunds.
- **Future Architecture:** Integrate Razorpay Offers API (`/v1/offers`) to synchronize backend promotional campaigns with payment gateway BIN validation rules.

### B. Customer Loyalty Tiers & Spend-Based Rewards
- **Scope:** Automated VIP tier levels (Bronze, Silver, Gold, Platinum) with permanent percentage benefits and exclusive quarterly voucher drops.
- **Why Deferred:** Kept lean in favor of the existing targeted coupon model (`TARGETED` visibility and `targetedUserIds`), which allows admins to assign VIP vouchers directly to specific customer accounts without tier bloat.
- **Future Architecture:** Add an automated background tier-calculation worker based on cumulative completed order values over a rolling 12-month period.

### C. Stackable Multi-Coupon Baskets
- **Scope:** Permitting customers to apply multiple promo codes simultaneously (e.g., storewide promo + category voucher + payment method discount).
- **Why Deferred:** Current business rule strictly enforces one coupon per order (and prevents combining coupon codes with affiliate referral codes unless `canCombineWithReferral: true` is explicitly enabled) to protect unit margins and prevent double-dipping.
- **Future Architecture:** Introduce coupon priority ordering, stacking hierarchy matrices, and composite allocation algorithms if multi-coupon baskets are requested.

### D. Internal Store Credit & Cashback Wallet
- **Scope:** Customer digital wallet where returns, referral bonuses, or promotional cashback can be stored and used as tender during checkout.
- **Why Deferred:** Current system refunds customers directly to their original payment source or approved bank accounts via verified UTR payouts, keeping accounting strictly compliant without operating an unregulated wallet.
- **Future Architecture:** Implement double-entry ledger database models (`Wallet`, `WalletTransaction`, `LedgerEntry`) with strict ACID transaction guarantees.

---

## 4. Database & Schema Verification Gates

> [!IMPORTANT]
> **Standing Rule:** Never run database schema migrations or alter production tables without explicit written approval. All migrations below are applied locally to the dev database only (`laptopmitra_dev_fresh` and `laptopmitra_test`). Remote Supabase databases are untouched.

### Production Schema Migration Register

| Proposal | Scope | Local Migration File | Remote Supabase Status | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **Proposal F** | Support Ticket Priority & Weighting | `20261103010000_support_ticket_priority` | **PENDING APPROVAL** | None |
| **Proposal A** | Pre-Dispatch Order Change Requests | `20261103020000_order_change_requests` | **PENDING APPROVAL** | `Order`, `OrderItem` |
| **Proposal C'**| Corporate Business Profile & Notes | `20261103030000_corporate_business_profile` | **PENDING APPROVAL** | `User`, `SupportTicket` |
| **Proposal D'**| Assured Buyback Guarantee Engine | `20261103040000_buyback_engine` | **PENDING APPROVAL** | `Order`, `OrderItem`, `Delivery` |
| **Proposal E** | Item-Level Pre-Dispatch Cancellation | `20261103050000_order_item_cancellations` | **PENDING APPROVAL** | `Order`, `OrderItem` |
| **Proposal B'**| Lease Contract & Installment Engine | `20261103060000_lease_engine` | **PENDING APPROVAL** | `OrderItem`, `RentalSubscription` |

### Pre-Cutover Database Audits:
- [ ] **Production Schema Parity Audit:** Perform a read-only audit of production Supabase PostgreSQL tables against dev schema:
  - Verify presence and type of `User.dob` (Timestamp/Date).
  - Verify presence and uniqueness of `User.referralCode` (String @unique).
  - Check constraints on `OrderItem.configuration` (`'default' | 'ram-16gb'`).
  - Verify `DiscountCode` and `DiscountRedemption` tables with snapshot columns (`code`, `title`, `type`, `value`, `maxDiscountCap`, `status`, `visibility`).
  - Check `allocatedDiscount` and `netPrice` on `OrderItem` for proportional return calculations.
  - Confirm sequence generators (`ticket_seq`, `return_seq`, `change_request_seq`, `buyback_seq`) are present and healthy.
  - Verify `ON DELETE RESTRICT` and append-only trigger enforcement on `BuybackEvent` and `ClientNote`.
- [ ] **Customer Row Integrity:** Ensure no duplicate user records exist for the same verified email before migrating or re-syncing authentication providers.
- [ ] **Database Connection Pooling:** Verify production connection pool limits (Supabase connection pooler in transaction mode) to prevent exhausted connections under concurrent load.

---

## 5. Environment Variables & Security Audits

Verify that each production deployment target has all required secrets configured with zero local leaks:

### A. API Backend (`apps/api`)
- [ ] `DATABASE_URL` (Targeting production Supabase pooler with SSL mode `require`).
- [ ] `APP_PUBLIC_URL` (Strict HTTPS origin: `https://api.laptopmitra.com`).
- [ ] `WEB_APP_URL` / `CORS_ORIGINS` (Restricted to authoritative web domains, e.g., `https://laptopmitra.com` and admin origin).
- [ ] `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (Production Firebase credentials).
- [ ] `JWT_SECRET` / Session encryption secrets.
- [ ] `AES_256_GCM_KEY` / Bank encryption key for buyback payout details at rest.

### B. Web App (`apps/web`)
- [ ] `NEXT_PUBLIC_API_URL` pointing to production API origin.
- [ ] `NEXT_PUBLIC_FIREBASE_*` configuration pointing to production client config.
- [ ] Verify that no server-only environment variables are prefixed with `NEXT_PUBLIC_`.

### C. Mobile App (`apps/mobile`)
- [ ] Production API URL configured in `eas.json` build profiles (`preview`, `production`).
- [ ] Ensure `app.json` / `app.config.ts` version code, permissions, and bundle identifiers match app store requirements.
- [ ] Verify zero Node.js runtime imports (`fs`, `crypto`, `path`) in Metro production bundle.

---

## 6. Client & UI Quality Checklist

- [ ] **Real-Time Pincode Verification:** Customer checkout dynamically validates Indian pincodes, shows detected City & State, and flags non-serviceable locations.
- [ ] **Delhi NCR COD Restriction:** Cash on Delivery radio option is strictly restricted to Delhi NCR locations with a clear badge; outside NCR, it displays explanatory guidance and preserves prepaid online payment options.
- [ ] **Coupons & Promo Codes:**
  - Customer can browse applicable and unlockable offers via offers sheet on web and mobile.
  - Online-only coupons properly disable COD option with clear plain-language messaging.
  - Net discount amount displays in green with zero remainder drift and never reduces payable below zero.
  - "My Coupons & Offers" in account area allows 1-click copying with visual feedback.
- [ ] **Situation-Aware "Need Help":**
  - "Need Help?" button appears on each ordered item and in the order summary on web and mobile.
  - Displays dynamic item situation badge and IST return window countdown when within 7 days of delivery.
  - Ineligible actions display clear, plain-language `disabledReason` without broken UI or dead clicks.
- [ ] **Order Change Requests:**
  - Pre-dispatch modal validates 6-digit PIN code or 10-digit mobile number.
  - Admin review console (`/admin/change-requests`) permits approve/reject with idempotent application.
- [ ] **Assured Buyback Guarantee:**
  - 4-point diagnostic checklist + 70% min battery health enforced.
  - Gross valuation and 15-day quote validity displayed transparently.
  - Encrypted bank/UPI details collected with masked display in staff views and audited decryption.
  - Free return shipment tracking dispatched if inspection offer is declined.
- [ ] **Corporate Business Profiles:**
  - Admin users view includes corporate profile modal (GSTIN format validation, company name, priority client toggle).
  - Open support tickets inherit priority weight for queue ordering.
  - Staff notes are strictly append-only.
- [ ] **Mitra Referral Format:** Newly registered affiliates automatically receive codes matching `mitra` + 4-char username slug + 4 digits (e.g. `mitrashiv4827`); existing affiliate referral links remain functional.
- [ ] **Zero Synthetic Tracking Steps:** Confirm the customer tracking view renders only real events (`PLACED` ➔ `CONFIRMED` ➔ `SHIPPING` ➔ `DELIVERED`).
- [ ] **No Hardcoded Values:** Confirm warranty displays dynamic invoice-backed dates rather than generic "1-Year" strings.
- [ ] **Honest Notification Settings:** Maintain the exclusion of SMS/WhatsApp toggles in customer settings until SMS gateway integration is contracted and deployed.
- [ ] **Visibility-Aware Polling:** Monitor client CPU and network overhead for the 60-second polling interval on in-progress orders when active in background tabs.
- [ ] **Invoice PDF Download:** Validate PDF invoice generation endpoint performance and ensure CDN caching headers protect customer privacy.

---

## 7. Pre-Cutover Verification Protocol

Immediately following deployment to staging or canary environments:

1. **Dual-Session Smoke Test:**
   - Execute a live order placement as a real customer account (both COD in Delhi NCR and prepaid Razorpay outside NCR).
   - Apply a public promotional coupon (`WELCOME10` or `FLAT1500`) and verify discount application in order confirmation.
   - Process the order inside the live Admin Dashboard (Confirm ➔ Add Tracking ➔ Mark Delivered).
   - Confirm customer UI updates without hard refreshes.
2. **Situation-Aware Support Smoke Test:**
   - Place a pre-dispatch order and submit an address change request. Approve and apply it from `/admin/change-requests`.
   - On a delivered test order, open "Need Help" and verify the 7-day IST return countdown.
   - On an eligible outright laptop, submit an Assured Buyback claim; review valuation and verify encrypted payout storage.
3. **Mitra Affiliate Balance Concurrency:**
   - Test simultaneous payout requests to ensure PostgreSQL row locks (`FOR UPDATE`) strictly prevent negative or double-drawn balances.
4. **Sign-Out Everywhere Verification:**
   - Ensure revoking tokens from `/account/security` successfully logs out all active web and mobile sessions.
5. **Log & Sentry Monitoring:**
   - Confirm that customer PII (phone numbers, emails, addresses, bank accounts) is masked in application logs and error reporting pipelines.

---

## 8. Current Verification Baseline

*Recorded as of November 2026 pre-deployment sync:*

| Test Suite / Package | Scope | Result | Status |
| :--- | :--- | :--- | :--- |
| **Turborepo Workspace** | All 8 packages (`web`, `mobile`, `api`, `types`, `tokens`, `api-client`, `config`, `env`) | 8 / 8 passed | Clean |
| **Web App Unit Tests** | Component logic, admin guards, account helpers, coupons, situation engine, buyback | 145 passed, 0 failed (49 suites) | Clean |
| **Mobile App Unit Tests** | Domain logic, plain language formatters, order eligibility, checkout payments, coupons, buyback | 47 passed, 0 failed (4 suites) | Clean |
| **API Unit & Security Tests** | Role enforcement, order controllers, return limits, affiliate locks, pincode verification, affiliate code generation, coupon allocation, situation engine, buyback, change requests, customer 360 | 596 passed, 0 failed (46 suites) | Clean |

---

*Pending verification: Production canary cutover and physical mobile device verification.*
