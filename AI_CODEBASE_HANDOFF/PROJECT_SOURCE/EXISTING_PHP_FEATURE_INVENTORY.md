# Existing PHP Feature Inventory — Laptop Mitra (Original Application)

> **Document Status:** Comprehensive Feature Audit  
> **Source Directory:** `c:\vloume d\laptopmitra\public_htmlphp`  
> **Live Production Website:** [https://laptopmitra.com/](https://laptopmitra.com/)  
> **Audit Date:** October 2026  
> **Auditor Role:** Senior Full-Stack Engineer, PHP Application Analyst & Database Architect  

---

## 1. Architecture & Technology Stack Overview

- **Core Runtime:** PHP 7.4 / 8.x with procedural architecture, MySQLi database abstraction, session-based state management (`PHPSESSID`), and Apache mod_rewrite.
- **Styling & UI Frameworks:** Tailwind CSS via CDN (`https://cdn.tailwindcss.com`), Font Awesome 6.4.0, Google Fonts (*Plus Jakarta Sans*, *Outfit*), Swiper 10/11, AOS (Animate on Scroll), Toastify-js, SweetAlert2.
- **Database Engine:** MySQL / MariaDB (`u797209756_laptop` / `xper_u797209756_laptop`).
- **External Third-Party Integrations:**
  - **Razorpay Payment Gateway:** SDK integrated under `payments/razorpay-php` and `payments/razorpay-config.php` (Order creation, Signature verification, Webhook callbacks).
  - **Transactional Email (SMTP):** PHPMailer via Google SMTP (`smtp.gmail.com:465` SSL) for OTP dispatch, password reset links, and order dispatch/tracking notifications.
  - **WhatsApp API:** Direct WhatsApp URI generation (`https://wa.me/917701993300`) with dynamic referral and product query parameters.
- **URL Routing:** Emulated Apache Clean URLs via `.htaccess`:
  - `RewriteRule ^ %1 [R=301,L]` (Strips `.php` extensions)
  - `RewriteRule ^laptop/([a-zA-Z0-9-]+)/?$ laptop-details.php?slug=$1 [L,QSA]`
  - `RewriteRule ^([^/.]+)$ $1.php [L]`

---

## 2. Comprehensive Inventory of Original Features

### 2.1 Navigation & Global UI

#### Feature: Glassmorphism Sticky Header & Dynamic Badges
- **Business Purpose:** Provide site-wide navigation, quick brand identification, immediate phone contact support, dynamic cart item count, and wishlist item count.
- **Relevant Files:**
  - `includes/header.php`
  - `header.php`
  - `includes/headerdown.php`
  - `assets/logo-laptop-mitra.png`
- **User Journey & Entry Point:** Every public page across the application.
- **Backend & Database Dependencies:**
  - Queries `cart` table: `SELECT SUM(quantity) FROM cart WHERE user_id = ?`
  - Queries `wishlist` table: `SELECT COUNT(*) FROM wishlist WHERE user_id = ?`
  - Queries `users` table: retrieves current user session state (`$_SESSION['user_id']`).
- **Validation & Business Logic:**
  - If user is logged in, displays "Profile", "My Orders", and "Logout".
  - If user is guest, displays "Login" and "Get Started" (`signup.php`).
  - Real-time cart & wishlist badge counter updated via session or AJAX.
- **Status:** **Active**

#### Feature: Global Predictive Search Bar
- **Business Purpose:** Instant search autocomplete overlay across catalog by model name, brand name, processor, or condition.
- **Relevant Files:**
  - `index.php` (lines 79–85, 450–480)
  - `search_api.php`
  - `includes/header.php`
- **User Journey & Entry Point:** Desktop top search input and mobile full-screen slide-down search overlay.
- **Backend & Database Dependencies:**
  - Server-side endpoint: `search_api.php?query=...` queries `SELECT id, brand, model, price_individual_sell, image, slug FROM laptops WHERE status='active' AND (model LIKE ? OR brand LIKE ?) LIMIT 8`.
  - Fallback client-side inlined JSON list embedded into `index.php`.
- **Validation & Output:**
  - Debounced input (>= 2 characters).
  - Renders dropdown with thumbnail, model title, brand badge, and formatted price.
- **Status:** **Active**

---

### 2.2 Product Catalog, Filtering & Specifications

#### Feature: Storefront Catalog & Multi-Faceted Filter
- **Business Purpose:** Complete commercial listing of certified pre-owned laptops with server-rendered multi-attribute filtering, search, and sorting.
- **Relevant Files:**
  - `store.php` (lines 1–720)
- **User Journey & Entry Point:** Navigation link `/store`.
- **Input Fields & Filtering Attributes:**
  - Brand (HP, Dell, Lenovo, Apple, Asus, Acer, Microsoft, etc.)
  - Processor type (Intel Core i3/i5/i7/i9, AMD Ryzen 5/7/9, Apple M-Series)
  - RAM options (`8GB`, `16GB`, `32GB`, `64GB`) dynamically ordered by integer casting: `ORDER BY CAST(SUBSTRING_INDEX(ram, 'GB', 1) AS UNSIGNED)`
  - Storage options (`256GB`, `512GB`, `1TB`, `2TB`)
  - Price Range Slider / Min-Max bounds
  - Sort order (`price_low`, `price_high`, `newest`, `popular`)
  - Active search keyword string
- **Backend & Database Dependencies:**
  - Dynamic SQL building with SQL injection safeguards:
    `SELECT * FROM laptops WHERE status='active' AND ... ORDER BY ...`
  - Gathers distinct filter facets directly from live inventory:
    `SELECT DISTINCT brand FROM laptops WHERE status='active'`
    `SELECT DISTINCT processor FROM laptops WHERE status='active'`
- **Status:** **Active**

#### Feature: Dual Purchasing Modes (Outright Buy vs. Monthly Lease/Rent)
- **Business Purpose:** Provide B2C and B2B customers the flexibility to either buy hardware outright or rent/lease hardware with low monthly commitments.
- **Relevant Files:**
  - `store.php`
  - `laptop-details.php` (lines 95–160, 360–390, 710–795)
  - `process_booking.php`
  - `ajax/cart_action.php`
- **Input & Business Logic:**
  - Every laptop record possesses separate base prices:
    - `price_individual_sell` (One-time Buy price)
    - `price_individual_lease` (Monthly Lease subscription price)
    - `price_bulk_sell` (Tiered corporate purchase price)
    - `price_bulk_lease` (Tiered corporate leasing price)
  - Customer selects active plan via interactive card toggle (`selectPlan('sell')` or `selectPlan('lease')`).
  - Active plan selection dynamically shifts all price displays, upgrade calculations, checkout paths, and cart items.
- **Status:** **Active & Core Commercial Driver**

#### Feature: Dynamic Hardware Configuration Upgrades
- **Business Purpose:** Allow buyers to customize hardware specifications (Standard 8GB vs Professional 16GB RAM / SSD expansion) before adding to cart.
- **Relevant Files:**
  - `laptop-details.php` (lines 98–100, 720–740)
  - `ajax/cart_action.php`
- **Business Rules & Calculations:**
  - Outright Buy: Upgrading to 16GB Pro adds fixed `+₹4,000` to `price_individual_sell`.
  - Lease/Rent: Upgrading to 16GB Pro adds fixed `+₹500/month` to `price_individual_lease`.
  - Live recalculation updates on-screen total, mobile sticky action bar, and cart payload.
- **Status:** **Active**

#### Feature: Multi-Angle Image Gallery & Zoom
- **Business Purpose:** Reassure pre-owned laptop buyers of genuine hardware condition through multiple high-resolution photos.
- **Relevant Files:**
  - `laptop-details.php` (lines 78–94, Swiper 11)
  - `admin/add-laptop.php` (lines 88–115)
- **Database Dependency:** `laptop_images` (`id`, `laptop_id`, `image_path`).
- **Status:** **Active**

#### Feature: Delivery Pincode Serviceability & ETA Check
- **Business Purpose:** Let customers verify express insured delivery availability to their exact 6-digit postal code before ordering.
- **Relevant Files:**
  - `laptop-details.php`
  - `cart.php`
- **Validation:** 6-digit Indian PIN code check with delivery window calculation.
- **Status:** **Active**

---

### 2.3 Mitra Referral & Affiliate Program

#### Feature: Auto-Generated Unique Mitra Referral Code
- **Business Purpose:** Incentivize word-of-mouth growth by providing every customer with an affiliate code that gives buyers ₹500 off and awards referrers ₹500 commission per unit.
- **Relevant Files:**
  - `index.php` (lines 24–77)
  - `laptop-details.php` (lines 60–76)
  - `affiliate-dashboard.php`
  - `signup.php`
- **Business Rules & Generation Algorithm:**
  1. Priority: uses user's sanitized name (e.g. "Anurag Kashyap" -> "ANURAGKASHYAP").
  2. Takes first 3 letters uppercase (`ANU`), padded with `X` if shorter.
  3. Appends random 4-digit number (1000–9999).
  4. Final format: `MITRA` + `[NAME_PART]` + `[RAND_4]` (e.g., `MITRAANU4821`).
  5. Saved immediately to `users.referral_code`.
- **Status:** **Active**

#### Feature: Incoming Referral Link Handling (`?ref=...`)
- **Business Purpose:** Capture incoming referral traffic from WhatsApp, social media, and links, validate eligibility, and auto-apply discounts.
- **Relevant Files:**
  - `index.php` (lines 79–130)
  - `ajax/validate_coupon.php`
  - `ajax/clear_coupon.php`
- **Business Rules:**
  - Self-referral prevention: If authenticated user's own code matches `?ref`, system blocks discount: *"You cannot use your own referral code"*.
  - Unauthenticated visitor: Stores `$_SESSION['pending_referral'] = $incoming_code` to apply automatically upon login/registration.
  - Authenticated visitor: Checks `coupon_usage` table to enforce single-use per buyer. If unused, sets `$_SESSION['applied_coupon'] = $incoming_code`, `$_SESSION['discount_amount'] = 500`, and `$_SESSION['referrer_id'] = $referrer_data['id']`.
- **Status:** **Active**

#### Feature: WhatsApp Share with Pre-Built Referral Pitch
- **Business Purpose:** One-click WhatsApp sharing containing product model, discount pitch, referral link, and Mitra coupon code.
- **Relevant Files:**
  - `index.php` (lines 420–445)
  - `laptop-details.php` (lines 740–765)
  - `affiliate-dashboard.php`
- **Formatted Template:**
  ```text
  🔥 Hey! Check out this certified laptop on Laptop Mitra:
  💻 *[Model Name]* (Processor • RAM)
  💰 Best Price: *₹[Price]*
  👇 *Buy Now & Get ₹500 OFF:*
  [URL]?ref=[MITRA_CODE]
  🎟️ Use Referral Code: *[MITRA_CODE]*
  ```
- **Status:** **Active**

#### Feature: Customer Affiliate Dashboard & Withdrawal Lifecycle
- **Business Purpose:** Allow affiliate partners to monitor link clicks, sales conversions, accrued earnings, bank accounts, and submit withdrawal requests.
- **Relevant Files:**
  - `affiliate-dashboard.php` (lines 1–643)
- **Database Tables:**
  - `affiliate_earnings` (`id`, `affiliate_id`, `buyer_id`, `booking_id`, `amount`, `status`)
  - `affiliate_payment_details` (`user_id`, `bank_name`, `account_holder_name`, `account_number`, `ifsc_code`, `upi_id`, `qr_code_image`, `updated_at`)
  - `withdrawal_requests` (`id`, `user_id`, `amount`, `status`, `payment_method_snapshot`, `created_at`, `processed_at`)
- **Workflow:**
  1. User enters Bank Details (Bank Name, Account Number, IFSC, Holder Name) OR UPI ID OR uploads QR Code image (`uploads/qr_codes/`).
  2. User specifies withdrawal amount (up to available wallet balance).
  3. System creates a `pending` entry in `withdrawal_requests` with a frozen snapshot of payment details.
  4. Real-time balance ledger tracks `Total Earned`, `Pending Withdrawal`, `Approved/Paid`, and `Available Wallet Balance`.
- **Status:** **Active**

---

### 2.4 Cart, Warranty Addon & Checkout

#### Feature: Full Cart Management & Extended Warranty Addon
- **Business Purpose:** Manage multi-item carts, choose between buy/lease modes, update quantities, and add extended service warranty per unit.
- **Relevant Files:**
  - `cart.php` (lines 1–497)
  - `ajax/cart_action.php`
  - `ajax/cart_update.php`
  - `ajax/cart_remove.php`
  - `ajax/cart_warranty_update.php`
- **Database Dependency:** `cart` table (`id`, `user_id`, `laptop_id`, `quantity`, `purchase_mode`, `configuration`, `has_warranty`, `model_name`, `price`).
- **Business Rules:**
  - Each cart row tracks `purchase_mode` ('sell' vs 'lease').
  - **Extended Warranty Addon:** Available exclusively for 'sell' items at **₹1,999 per unit**. Users can toggle the warranty per laptop, recalculating line total and grand total via AJAX.
  - Dynamic coupon validation and application directly within the cart drawer/page.
- **Status:** **Active**

#### Feature: Dual Checkout Channels (Direct Buy vs. Cart Checkout)
- **Business Purpose:** Allow instant 1-click checkout (`checkout.php?type=direct&id=...`) bypassing the cart, or standard checkout from cart.
- **Relevant Files:**
  - `checkout.php` (lines 38–105)
- **Status:** **Active**

#### Feature: Multi-Method Order Placement (COD vs. Razorpay Online)
- **Business Purpose:** Support Cash on Delivery / Offline Payment booking and instant Online Payment via Razorpay.
- **Relevant Files:**
  - `checkout.php` (lines 212–351)
  - `payments/create-order.php`
  - `payments/verify-payment.php`
  - `payments/razorpay-config.php`
  - `order-success.php`
- **Input Fields & Validations:**
  - Full Name, Email, Phone Number (sanitized with regex `/[^\d\+]/`), Alternate Contact Phone.
  - House/Flat No, Street/Area, Landmark, City, State, 6-digit Pincode, Address Type ('Home', 'Office', 'Other').
- **Business Logic on COD Submission:**
  1. Inserts record(s) into `bookings` with status `'Pending'`, payment status `'Pending'`.
  2. Deducts stock quantity and increments `sales_count` in `laptops`:
     `UPDATE laptops SET stock_quantity = stock_quantity - ?, sales_count = sales_count + ? WHERE id = ?`
  3. Credits `affiliate_earnings` with ₹500 per unit if an affiliate coupon is present.
  4. Records entry in `coupon_usage` (`user_id`, `coupon_code`, `NOW()`).
  5. Clears user's cart and redirects to `order-success.php`.
- **Business Logic on Online Submission:**
  1. Stores checkout data and cart items in session.
  2. Redirects to `payments/create-order.php` which invokes Razorpay API: `POST /orders` with currency `INR`, amount in paise (`$final_payable * 100`), receipt ID `order_rcptid_...`.
  3. Displays Razorpay Checkout modal with prefilled customer name, email, contact, and brand logo.
  4. On completion, submits signature to `payments/verify-payment.php`:
     `$api->utility->verifyPaymentSignature(['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'])`.
  5. If valid, inserts into `bookings` with status `'Pending'`, `payment_status = 'Paid'`, records `payment_id`, updates stock, records affiliate earnings, and redirects to `order-success.php`.
- **Status:** **Active**

---

### 2.5 Corporate Leasing & Bulk Procurement Inquiries

#### Feature: Corporate / Bulk Procurement Inquiry Handler
- **Business Purpose:** Enable B2B clients and corporate IT managers to request wholesale quotes or fleet leases for 5+ laptop units.
- **Relevant Files:**
  - `process_booking.php` (lines 1–89)
  - `admin/process_admin_booking.php`
- **Input Fields:**
  - `laptop_id`, `laptop_name`, `mode` (`sell` vs `lease`), `purchase_type` (`individual` vs `bulk`), `quantity`, `name`, `email`, `phone`, `address`, `notes`.
- **Pricing Resolution:**
  - Mode = `sell`, Type = `bulk` -> Resolves unit price to `price_bulk_sell`.
  - Mode = `sell`, Type = `individual` -> Resolves unit price to `price_individual_sell`.
  - Mode = `lease`, Type = `bulk` -> Resolves unit price to `price_bulk_lease`.
  - Mode = `lease`, Type = `individual` -> Resolves unit price to `price_individual_lease`.
- **Database Action:**
  - Inserts into `bookings` table with status `'Pending'`, capturing custom notes, volume requirements, and resolved wholesale unit price.
- **Status:** **Active**

---

### 2.6 Customer Account, Wishlist & Order History

#### Feature: Customer Authentication with Email OTP Verification
- **Business Purpose:** Ensure genuine user accounts and reduce fraud via 6-digit email OTP dispatch upon registration.
- **Relevant Files:**
  - `signup.php` (lines 1–250)
  - `verify_otp.php` (lines 1–120)
  - `send_mail.php`
  - `login.php`
  - `logout.php`
- **Database Fields in `users`:**
  - `fullname`, `email`, `phone`, `password` (bcrypt hash), `otp_code`, `otp_expiry`, `is_verified`, `referral_code`, `created_at`.
- **Workflow:**
  1. User submits registration form.
  2. System generates cryptographically secure 6-digit OTP, sets expiry (`NOW() + INTERVAL 10 MINUTE`), and dispatches branded email via PHPMailer.
  3. User enters OTP on `verify_otp.php`.
  4. On match, sets `is_verified = 1`, generates initial Mitra referral code, and establishes session.
- **Status:** **Active**

#### Feature: Password Recovery via Token / OTP
- **Business Purpose:** Self-service password recovery for customers locked out of their accounts.
- **Relevant Files:**
  - `forgot-password.php`
  - `forgot_password_handler.php`
  - `reset-otp.php`
  - `reset-password.php`
- **Status:** **Active**

#### Feature: Customer Profile & Address Management
- **Business Purpose:** View personal profile, update contact information, change password, and view referral stats.
- **Relevant Files:**
  - `profile.php` (lines 1–380)
- **Status:** **Active**

#### Feature: Customer Order History & Tracking Modal
- **Business Purpose:** Detailed tracking of all placed orders, shipping statuses, and item specifications.
- **Relevant Files:**
  - `orders.php` (lines 1–449)
- **Database Dependency:** Queries `bookings` JOIN `laptops` WHERE `customer_email = ?`.
- **Features Displayed:**
  - Order card with thumbnail, model title, purchase mode badge ('BUY' vs 'RENT'), unit price, quantity, total price, and status badge (`Pending`, `Confirmed`, `Shipped`, `Delivered`, `Canceled`).
  - Interactive "View Details" modal showing shipping address, city, state, postal code, payment mode, payment transaction ID, courier partner, and tracking ID.
- **Status:** **Active**

#### Feature: Persistent User Wishlist
- **Business Purpose:** Save products for future purchase with instant toggle and badge updates.
- **Relevant Files:**
  - `wishlist.php`
  - `wishlist_action.php`
  - `ajax/wishlist_action.php`
- **Database Table:** `wishlist` (`id`, `user_id`, `laptop_id`, `mode`).
- **Features:** Save item, toggle item, move from wishlist directly into cart (`Move to Cart`), remove item.
- **Status:** **Active**

---

### 2.7 Warranties, Returns & Buyback Guarantee

#### Feature: 36-Month Lifetime Buyback Guarantee
- **Business Purpose:** Standout commercial guarantee that ensures customers can sell their laptop back to Laptop Mitra within 36 months at guaranteed valuation tiers.
- **Relevant Files:**
  - `terms-condition-buyback.php` (lines 1–142)
  - `terms-and-condition.php` (lines 115–125)
- **Guaranteed Valuation Schedule:**
  - **0 – 6 Months:** **70%** of original purchase invoice price
  - **6 – 12 Months:** **60%** of original purchase invoice price
  - **12 – 24 Months:** **50%** of original purchase invoice price
  - **24 – 36 Months:** **40%** of original purchase invoice price
- **Inspection & Eligibility Rules:**
  - Laptop must boot and have functioning motherboard.
  - Display free of cracks or heavy screen bleeding.
  - Original charger included.
  - Battery health >= 70%.
- **Status:** **Active & Key Trust Factor**

#### Feature: 7-Day Replacement & Return Policy
- **Business Purpose:** 7-day money-back guarantee if laptop delivered is defective or deviates from certified grade.
- **Relevant Files:**
  - `terms-and-condition.php`
- **Status:** **Active**

---

### 2.8 Administrative Dashboard & Back-Office Operations

#### Feature: Admin Authentication & Session Security
- **Business Purpose:** Separate administrative credential authentication to protect back-office functions.
- **Relevant Files:**
  - `admin/login.php`
  - `admin/logout.php`
  - `admin/includes/sidebar.php`
- **Database Table:** `admin_users` (`id`, `username`, `password`, `created_at`).
- **Status:** **Active**

#### Feature: Executive Admin KPI Dashboard
- **Business Purpose:** Real-time visibility into pending orders, catalog size, active stock units, registered user count, and recent bookings.
- **Relevant Files:**
  - `admin/index.php` (lines 1–288)
- **Status:** **Active**

#### Feature: Catalog CRUD Management (Add, Edit, Delete Laptops)
- **Business Purpose:** Complete product administration including specs, multiple price tiers, and multi-image galleries.
- **Relevant Files:**
  - `admin/add-laptop.php`
  - `admin/edit-laptop.php`
  - `admin/delete-laptop.php`
  - `admin/inventory.php`
- **Form Fields:**
  - Brand, Model, Processor, RAM, Storage, Graphics, Display, Operating System.
  - `price_individual_sell`, `price_bulk_sell`, `price_individual_lease`, `price_bulk_lease`.
  - Stock quantity, Status (`active` / `inactive`), Description.
  - Primary image upload + multiple gallery images uploaded to `uploads/` and recorded in `laptop_images`.
- **Status:** **Active**

#### Feature: CSV Bulk Inventory Export
- **Business Purpose:** One-click download of full catalog as CSV spreadsheet for offline inventory auditing, ERP integration, or bulk updating.
- **Relevant Files:**
  - `admin/export_laptops.php` (lines 1–30)
- **Export Columns:** `ID`, `Brand`, `Model`, `Processor`, `RAM`, `Storage`, `Graphics`, `Price (Sell)`, `Price (Lease)`, `Stock`, `Status`, `Description`.
- **Status:** **Active**

#### Feature: CSV Bulk Inventory Import
- **Business Purpose:** Fast bulk upload of laptops via CSV file, bypassing manual one-by-one web form entry.
- **Relevant Files:**
  - `admin/import_laptops.php` (lines 1–55)
- **Format:** `Brand, Model, Processor, RAM, Storage, Graphics, Price(Sell), Price(Lease), Stock, Description`.
- **Status:** **Active**

#### Feature: Order Lifecycle Management & Automated Courier Dispatch Emails
- **Business Purpose:** Process customer orders, update delivery status, assign courier name & tracking ID, and notify customer via email.
- **Relevant Files:**
  - `admin/bookings.php` (lines 1–484)
  - `admin/view-bookings.php`
  - `admin/view_booking.php`
  - `admin/all-bookings.php`
- **Supported Statuses:** `Pending`, `Contacted`, `Confirmed`, `Shipped`, `Delivered`, `Canceled`.
- **Automated Email Notification:**
  - When status updates to `Confirmed`, `Shipped`, `Delivered`, or `Canceled`, admin inputs `courier_name` and `tracking_id`.
  - Automatically sends HTML email via PHPMailer to customer with branded tracking block and order breakdown.
- **Status:** **Active**

#### Feature: Admin Manual Booking Creation
- **Business Purpose:** Allow sales reps to create phone or walk-in orders directly from the admin panel.
- **Relevant Files:**
  - `admin/process_admin_booking.php` (lines 1–102)
- **Status:** **Active**

#### Feature: Affiliate Partner Management & Payout Processing
- **Business Purpose:** Review affiliate partners, verify banking/UPI credentials, inspect QR codes, and approve/reject cash withdrawals.
- **Relevant Files:**
  - `admin/affiliates.php` (lines 1–72)
  - `admin/affiliate-details.php` (lines 1–380)
- **Administrative Actions:**
  - List all affiliates with `Total Earned`, `Paid`, `Pending Balance`.
  - Detailed partner ledger showing individual conversion orders, buyer names, commission amounts, and dates.
  - View saved bank account details, IFSC, UPI ID, and interactive image preview of uploaded QR code.
  - Approve or Reject withdrawal requests with one click (`UPDATE withdrawal_requests SET status = 'approved', processed_at = NOW()`).
- **Status:** **Active**

#### Feature: User Account Administration
- **Business Purpose:** View customer directory, verified status, contact details, and created dates.
- **Relevant Files:**
  - `admin/users.php` (lines 1–110)
- **Status:** **Active**

---

### 2.9 Discovered Operational Utility

#### Feature: Internal Salary Slip Generator
- **Business Purpose:** Internal HR payroll slip generator for "XpertNote Analytics LLP" calculating Basic, HRA, Conveyance, Special Allowance, PF, and Tax with Indian Rupee words conversion.
- **Relevant Files:**
  - `salary.php` (lines 1–561)
- **Status:** **Internal Operational Tool (Non-Customer Facing)**
