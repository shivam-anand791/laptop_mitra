# Feature Restoration Implementation Plan — Laptop Mitra

> **Document Status:** Evidence-Based Restoration Roadmap  
> **Target Base:** `c:\vloume d\laptopmitra\apps`  
> **Source Baseline:** `c:\vloume d\laptopmitra\public_htmlphp`  
> **Execution Strategy:** Incremental, non-destructive restoration preserving existing Next.js / NestJS architecture, modern design tokens, and type safety.  
> **Audit Date:** October 2026  
> **Auditors:** Senior Full-Stack Engineer, React/Node.js Engineer, Database Architect & QA Lead  

---

## Roadmap Overview & Prioritization

The restoration tasks are prioritized into four disciplined execution phases:
- **Phase 1 (P0): Critical Commercial Workflows & Financial Integrity** (Multi-mode leasing, cart item models, corporate procurement requests, affiliate withdrawals).
- **Phase 2 (P1): Essential Commercial & Customer Functionality** (Extended warranty addons, hardware config upgrades, 36-month buyback guarantee, CSV bulk inventory, courier dispatch alerts, WhatsApp affiliate pitch).
- **Phase 3 (P2): Usability, Secondary Operations & Legacy Migration** (Predictive search autocomplete, live filter facets, legal pages, legacy user migration, manual phone order entry).
- **Phase 4 (P3): Low-Impact Polish** (Automated valuation calculator).

---

## Phase 1: Critical Commercial Workflows & Financial Integrity (P0)

### 1.1 Product Pricing Schema Alignment (Lease & Wholesale Pricing)
- **ID:** `GAP-PRC-01`
- **Priority:** **P0** | **Complexity:** **Medium**
- **Exact Behavior to Restore:**  
  Restore database-backed pricing for outright purchase, monthly lease subscription, bulk sell (5+ units), and bulk lease (5+ units), eliminating the arbitrary hardcoded `Math.round(priceNum * 0.08)` formula in the frontend.
- **Existing Components/Services to Reuse:**  
  - Prisma schema in `apps/api/prisma/schema.prisma`.
  - Product module in `apps/api/src/modules/product/`.
  - Admin Product forms in `apps/web/app/admin/products/page.tsx`.
- **Database & Migration Changes:**
  ```prisma
  // In Product model (schema.prisma)
  leasePriceMonthly Decimal?  @db.Decimal(10, 2)
  bulkSellPrice     Decimal?  @db.Decimal(10, 2)
  bulkLeasePrice    Decimal?  @db.Decimal(10, 2)
  ```
- **Backend / API Changes:**
  - Update `CreateProductDto` and `UpdateProductDto` in `apps/api/src/modules/product/dto/`.
  - Update `ProductService` to read and persist the new price fields.
- **Frontend Changes:**
  - Update `apps/web/lib/types.ts` `Product` interface.
  - In `apps/web/app/products/[id]/page.tsx`, resolve `leaseMonthlyPrice` from `product.leasePriceMonthly` (falling back to calculated rate only if null).
  - Add inputs for lease and bulk pricing in Admin Product modal.
- **Test Cases & Acceptance Criteria:**
  - Product created with `price = 85000`, `leasePriceMonthly = 3200`, `bulkSellPrice = 78000`, `bulkLeasePrice = 2900` displays exact respective numbers on PDP when toggling Outright vs. Lease.

---

### 1.2 Multi-Mode Cart & Order Items (Rent vs. Buy Support)
- **ID:** `GAP-CRT-01`
- **Priority:** **P0** | **Complexity:** **Large**
- **Exact Behavior to Restore:**  
  Allow customers to place both Outright Purchase ('sell') and Monthly Rental/Lease ('lease') items into their cart and complete checkout, displaying appropriate badges ('BUY' vs. 'RENT/mo') and calculating recurring subscription charges accurately.
- **Existing Components/Services to Reuse:**  
  - `apps/web/lib/cart-context.tsx`
  - `apps/web/app/cart/page.tsx`
  - `apps/api/src/modules/cart/`
  - `apps/api/src/modules/order/`
- **Database & Migration Changes:**
  ```prisma
  // Update CartItem
  model CartItem {
    id            String   @id @default(uuid())
    cart          Cart     @relation(fields: [cartId], references: [id])
    cartId        String
    product       Product  @relation(fields: [productId], references: [id])
    productId     String
    quantity      Int      @default(1)
    purchaseMode  String   @default("sell") // "sell" | "lease"
    configuration String?  // e.g., "16GB Pro" | "8GB Std"
    hasWarranty   Boolean  @default(false)
    warrantyPrice Decimal  @default(0)
    priceAtAdd    Decimal
    createdAt     DateTime @default(now())

    @@unique([cartId, productId, purchaseMode, configuration])
    @@index([cartId])
  }

  // Update OrderItem
  model OrderItem {
    id            String   @id @default(uuid())
    order         Order    @relation(fields: [orderId], references: [id])
    orderId       String
    product       Product  @relation(fields: [productId], references: [id])
    productId     String
    quantity      Int
    purchaseMode  String   @default("sell")
    configuration String?
    hasWarranty   Boolean  @default(false)
    warrantyPrice Decimal  @default(0)
    price         Decimal
    createdAt     DateTime @default(now())
  }
  ```
- **Backend / API Changes:**
  - Update `CartService.addItem` to accept `purchaseMode`, `configuration`, and `hasWarranty`.
  - Update `OrderService.createOrder` to copy line-item purchase mode and configuration into `OrderItem`.
- **Frontend Changes:**
  - Update `CartContext.addItem(product, quantity, { purchaseMode, configuration, hasWarranty })`.
  - Update `apps/web/app/products/[id]/page.tsx` so "Corporate Lease" tab passes `purchaseMode: 'lease'` to `addItem`.
  - Update `apps/web/app/cart/page.tsx` to render 'RENT' vs. 'BUY' tag and `/mo` price suffix.
- **Test Cases & Acceptance Criteria:**
  - User can add 1 ThinkPad as 'BUY' and 1 ThinkPad as 'RENT' to the same cart without unique key collision.
  - Cart renders separate line items with accurate monthly vs outright price summaries.
  - Checkout generates order preserving item lease vs buy statuses.

---

### 1.3 Corporate / Bulk Procurement Inquiry Handler
- **ID:** `GAP-LSG-01`
- **Priority:** **P0** | **Complexity:** **Medium**
- **Exact Behavior to Restore:**  
  Restore the in-app corporate procurement quote request form (`process_booking.php`) so B2B enterprise leads and wholesale fleet requirements are stored directly in the database, with automatic lead alerts to sales reps.
- **Existing Components/Services to Reuse:**  
  - `apps/web/components/Navbar.tsx` ("Get a Quote" button)
  - `apps/web/app/page.tsx` ("Bulk Laptop Sales For Growing Teams" section)
  - Support module in `apps/api/src/modules/support/`
- **Database & Migration Changes:**
  ```prisma
  model CorporateInquiry {
    id             String   @id @default(uuid())
    companyName    String
    contactPerson  String
    email          String
    phone          String
    laptopModel    String?
    productId      String?
    mode           String   @default("sell") // "sell" | "lease"
    quantity       Int      @default(5)
    city           String
    expectedTenure String?  // e.g. "12 Months", "24 Months", "Outright Purchase"
    notes          String?
    status         String   @default("PENDING") // "PENDING" | "CONTACTED" | "QUOTED" | "CLOSED"
    createdAt      DateTime @default(now())
    updatedAt      DateTime @updatedAt
  }
  ```
- **Backend / API Changes:**
  - Add `POST /support/corporate-inquiry` endpoint with rate limiting (`@Throttle`).
  - Add admin review endpoints in `AdminController`: `GET /admin/inquiries` and `PUT /admin/inquiries/:id/status`.
- **Frontend Changes:**
  - Replace dummy WhatsApp links in `Navbar.tsx` and `page.tsx` with an interactive "Request Corporate Quote" modal dialog.
  - Collect: Company Name, Contact Name, Business Email, Phone, Preferred Mode (Lease vs Buy), Estimated Fleet Size, and Notes.
  - Display success confirmation with inquiry tracking reference.
- **Test Cases & Acceptance Criteria:**
  - Submitting corporate inquiry validates required fields, stores entry in database, and notifies admin.
  - Admin can filter and review pending inquiries from back-office panel.

---

### 1.4 Affiliate Banking Details & Withdrawal Lifecycle
- **ID:** `GAP-REF-04`, `GAP-REF-05`, `GAP-ADM-04`
- **Priority:** **P0** | **Complexity:** **Large**
- **Exact Behavior to Restore:**  
  Restore the complete affiliate partner banking setup and payout request workflow (`affiliate-dashboard.php` and `admin/affiliate-details.php`), enabling affiliates to input Bank details, UPI IDs, or QR codes, submit cash withdrawal requests, and allowing admins to inspect credentials and approve or reject payouts.
- **Existing Components/Services to Reuse:**  
  - `apps/web/app/account/referral/page.tsx`
  - `apps/api/src/modules/discount/`
  - `apps/api/src/modules/admin/`
- **Database & Migration Changes:**
  ```prisma
  model AffiliatePaymentDetails {
    id                String   @id @default(uuid())
    user              User     @relation(fields: [userId], references: [id])
    userId            String   @unique
    bankName          String?
    accountHolderName String?
    accountNumber     String?
    ifscCode          String?
    upiId             String?
    qrCodeUrl         String?
    updatedAt         DateTime @updatedAt
  }

  model WithdrawalRequest {
    id                     String   @id @default(uuid())
    user                   User     @relation(fields: [userId], references: [id])
    userId                 String
    amount                 Decimal  @db.Decimal(10, 2)
    status                 String   @default("PENDING") // "PENDING" | "APPROVED" | "REJECTED"
    paymentMethodSnapshot  String   // Frozen snapshot of bank/UPI details at time of request
    adminNotes             String?
    processedAt            DateTime?
    createdAt              DateTime @default(now())

    @@index([userId])
    @@index([status])
  }
  ```
- **Backend / API Changes:**
  - `POST /discounts/payout-details`: Saves/updates user's bank details or UPI ID.
  - `POST /discounts/withdraw`: Validates requested amount <= available referral balance, freezes payment snapshot, and creates `WithdrawalRequest`.
  - `GET /admin/affiliates`: Lists affiliate partners, total commissions, paid commissions, and pending balances.
  - `PUT /admin/withdrawals/:id`: Approves or rejects payout request, updating ledger and setting `processedAt = now()`.
- **Frontend Changes:**
  - In `apps/web/app/account/referral/page.tsx`, add "Payout Settings" tab with Bank / UPI form and "Request Payout" modal.
  - Create `apps/web/app/admin/affiliates/page.tsx` displaying partner cards, bank details, and action buttons for pending withdrawals.
- **Test Cases & Acceptance Criteria:**
  - Affiliate enters bank account and requests ₹1,500 payout. System checks balance >= 1500 and creates pending request.
  - Admin inspects request in Admin panel, clicks "Approve", status updates to `APPROVED`, and balance reflects as paid.

---

## Phase 2: Essential Commercial & Customer Functionality (P1)

### 2.1 Extended Warranty Addon (+₹1,999) on PDP and Cart
- **ID:** `GAP-CRT-02`
- **Priority:** **P1** | **Complexity:** **Medium**
- **Exact Behavior to Restore:**  
  Restore the 1-Year Extended Service Warranty purchase add-on (+₹1,999 per unit) available on PDP and in the Cart drawer/page for outright purchase laptops (`cart_warranty_update.php`).
- **Implementation:**
  - Add `hasWarranty` checkbox toggle on PDP and each Cart item card.
  - Toggling warranty instantly updates line item total and grand total.
  - Order creation persists `hasWarranty = true` and `warrantyPrice = 1999` in `OrderItem`.
- **Test Cases:**
  - Adding 2 laptops with warranty selected increases subtotal by exactly `2 * 1999 = ₹3,998`.

---

### 2.2 Hardware Specification Upgrade Selector (Standard vs. 16GB Pro)
- **ID:** `GAP-PRC-02`
- **Priority:** **P1** | **Complexity:** **Small**
- **Exact Behavior to Restore:**  
  Restore hardware specification selector on PDP allowing buyers to choose between Standard (8GB RAM / 256GB SSD) and Professional Upgraded (16GB RAM / 512GB SSD) with real-time price delta (+₹4,000 for buy, +₹500/mo for lease).
- **Implementation:**
  - Add interactive segmented control on `apps/web/app/products/[id]/page.tsx` for Configuration: Standard vs 16GB Pro.
  - Update `priceNum` and `leaseMonthlyPrice` dynamically.
  - Pass configuration string to `addItem`.
- **Test Cases:**
  - Selecting "16GB Pro Upgrade" on an ₹85,000 laptop updates PDP price to ₹89,000; adding to cart displays item as "Lenovo ThinkPad (16GB Pro)" at ₹89,000.

---

### 2.3 36-Month Lifetime Buyback Guarantee Policy Page & Terms
- **ID:** `GAP-BYB-01`
- **Priority:** **P1** | **Complexity:** **Small**
- **Exact Behavior to Restore:**  
  Restore the comprehensive 36-Month Buyback Guarantee legal terms and valuation schedule table (`terms-condition-buyback.php`), preserving trust and transparency.
- **Implementation:**
  - Create `apps/web/app/buyback-guarantee/page.tsx` using modern design tokens.
  - Replicate the assured valuation table:
    - 0 – 6 Months: 70%
    - 6 – 12 Months: 60%
    - 12 – 24 Months: 50%
    - 24 – 36 Months: 40%
  - Detail inspection requirements (functioning motherboard, display health, 70%+ battery health).
  - Add links in Footer and PDP warranty tab.
- **Test Cases:**
  - Direct navigation to `/buyback-guarantee` renders cleanly without layout shift or 404.

---

### 2.4 Admin CSV Bulk Inventory Import & Export
- **ID:** `GAP-ADM-02`, `GAP-ADM-03`
- **Priority:** **P1** | **Complexity:** **Medium**
- **Exact Behavior to Restore:**  
  Restore one-click CSV export (`export_laptops.php`) and CSV bulk upload (`import_laptops.php`) in the revamped admin portal.
- **Implementation:**
  - Backend: Add `GET /admin/products/export-csv` (streams CSV headers and rows) and `POST /admin/products/import-csv` (parses multipart CSV with validation using `csv-parser` or `fast-csv`).
  - Frontend: Add "Export CSV" and "Import CSV" buttons in `apps/web/app/admin/products/page.tsx`.
- **Test Cases:**
  - Export generates valid UTF-8 CSV containing all catalog products.
  - Uploading a 20-row CSV creates 20 new products with parsed specs and prices.

---

### 2.5 Dispatch Courier Name & Tracking Assignment with Transactional Email
- **ID:** `GAP-ORD-02`, `GAP-ADM-06`
- **Priority:** **P1** | **Complexity:** **Medium**
- **Exact Behavior to Restore:**  
  Allow admin to enter `courier_name` (e.g. BlueDart, Delhivery, DTDC) and `tracking_id` when moving an order to `SHIPPING` status, automatically triggering a branded transactional email via SMTP to the customer.
- **Implementation:**
  - Update `apps/api/src/modules/admin/dto/update-order-status.dto.ts` to accept optional `courierName` and `trackingNumber`.
  - Update `OrderService.updateStatus` to persist courier info to `Delivery` model.
  - Implement `NotificationService.sendShippingNotification(order, delivery)` via Nodemailer using configured SMTP credentials.
  - In `apps/web/app/admin/orders/page.tsx`, show courier & tracking input fields when selecting status `SHIPPING`.
- **Test Cases:**
  - Moving order to `SHIPPING` with courier "BlueDart" and tracking "BD123456789" saves delivery record and dispatches email containing clickable tracking link.

---

### 2.6 WhatsApp Share with Dynamic Mitra Referral Pitch on PDP
- **ID:** `GAP-REF-03`
- **Priority:** **P1** | **Complexity:** **Small**
- **Exact Behavior to Restore:**  
  Restore 1-click WhatsApp sharing on the PDP (`laptop-details.php:740`) embedding the product's title, specifications, discounted price, and the logged-in user's active Mitra referral code.
- **Implementation:**
  - Add "Share & Earn ₹500" WhatsApp button next to "Buy Now" on PDP.
  - Uses `https://wa.me/?text=${encodeURIComponent(pitch)}`.
- **Test Cases:**
  - Clicking WhatsApp button on mobile or desktop launches WhatsApp with pre-filled message including user's referral link.

---

### 2.7 Legal & Company Information Pages (`/about`, `/privacy`, `/terms`)
- **ID:** `GAP-NAV-03`, `GAP-NAV-04`
- **Priority:** **P1** | **Complexity:** **Small**
- **Exact Behavior to Restore:**  
  Restore the missing static information pages to eliminate 404 links from the footer:
  - `apps/web/app/about/page.tsx`: About Laptop Mitra, refurbishment lab, mission.
  - `apps/web/app/privacy/page.tsx`: Verified Privacy Policy from `privacy-policy.php`.
  - `apps/web/app/terms/page.tsx`: Terms of Service, 7-day return policy, warranties.
- **Test Cases:**
  - All footer links resolve to HTTP 200 with complete content.

---

## Phase 3: Usability, Secondary Operations & Legacy Migration (P2)

### 3.1 Legacy PHP Customer Credential Migration Strategy
- **ID:** `GAP-ATH-01`
- **Priority:** **P2** | **Complexity:** **Medium**
- **Strategy:**
  - Users created in PHP have bcrypt password hashes in MySQL. Firebase Auth cannot directly verify bcrypt without custom token authentication or admin SDK migration.
  - Provide a graceful migration route: When a legacy email attempts login, if not found in Firebase, check PostgreSQL migrated table; if credentials match, auto-provision Firebase user via Firebase Admin SDK, or trigger one-click password setup link.

---

### 3.2 Predictive Search Autocomplete Dropdown
- **ID:** `GAP-SCH-01`
- **Priority:** **P2** | **Complexity:** **Medium**
- **Strategy:**
  - Add live autocomplete popover to `apps/web/components/SearchBar.tsx`.
  - Debounce search input by 250ms, fetching `/products?search=...&limit=5`.
  - Display thumbnail, model name, brand badge, and price with keyboard arrow navigation.

---

### 3.3 Dynamic Filter Facets API
- **ID:** `GAP-SCH-02`
- **Priority:** **P2** | **Complexity:** **Small**
- **Strategy:**
  - Create `GET /products/filters` endpoint querying distinct brands, processors, and RAM options from database.
  - Pass live data to `FilterSidebar.tsx`.

---

### 3.4 Admin Manual Phone / Walk-In Order Creator
- **ID:** `GAP-ADM-05`
- **Priority:** **P2** | **Complexity:** **Medium**
- **Strategy:**
  - Add "Create Manual Booking" button on `apps/web/app/admin/orders/page.tsx`.
  - Modal allows sales staff to pick product, enter customer name, phone, address, mode ('sell' | 'lease'), and payment type ('COD' | 'Paid Offline').

---

## Acceptance Testing & Verification Matrix

| Area | Verification Method | Success Criteria |
|---|---|---|
| **Dual Pricing (Buy / Lease)** | Browser & API Test | PDP toggles exact database monthly lease rate; cart creates lease item. |
| **Corporate Inquiry** | Form Submission Test | Submitting corporate quote form stores record in database and alerts sales team. |
| **Mitra Affiliate Payouts** | End-to-End Ledger Test | Affiliate submits bank details + ₹1000 withdrawal; admin approves; ledger balance reflects paid. |
| **Extended Warranty Addon** | Checkout Calculation Test | Toggling ₹1,999 warranty increments order line item and invoice breakdown accurately. |
| **CSV Import & Export** | File Round-Trip Test | Exported CSV can be re-imported without schema errors or dropped records. |
| **Courier Tracking Alerts** | SMTP Dispatch Test | Updating order to `SHIPPING` with BlueDart tracking sends customer HTML email. |
| **Legal & Policy Pages** | Navigation Test | `/about`, `/buyback-guarantee`, `/privacy`, `/terms` all return HTTP 200. |
