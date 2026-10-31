# Revamped Application Feature Inventory — Laptop Mitra

> **Document Status:** Comprehensive Architecture & Implementation Audit  
> **Source Directory:** `c:\vloume d\laptopmitra\apps`  
> **Live Production Website:** [https://laptop-mitra.vercel.app/](https://laptop-mitra.vercel.app/)  
> **Backend Production API:** `https://laptopmitra-api.onrender.com`  
> **Audit Date:** October 2026  
> **Auditor Role:** Senior Full-Stack Engineer, React/Node.js Engineer & Database Architect  

---

## 1. Architecture & Technology Stack Overview

- **Monorepo Architecture:** Managed via Turborepo (`turbo 2.10.12`) and `pnpm 8.15.4` workspace:
  - `apps/web`: Next.js 15 (React 19, TypeScript, Tailwind CSS, Lucide React).
  - `apps/api`: NestJS 10, TypeScript, Prisma ORM, PostgreSQL, Passport Firebase JWT auth, Class Validator, Swagger OpenAPI.
  - `apps/mobile`: React Native / Expo companion project.
  - `packages/*`: Shared modules (`types`, `tokens`, `config`, `env`, `api-client`).
- **State Management & Data Layer:**
  - Frontend: React Context (`AuthContext`, `CartContext`, `WishlistContext`), custom React hooks with dual local storage caching and backend synchronization.
  - Backend: Prisma Client 6.4.1 targeting PostgreSQL (`DATABASE_URL`).
- **Authentication & Security:**
  - Client: Firebase Auth (Web SDK 10.8) with Email/Password and Anonymous guest flows (Google sign-in is not implemented in the UI).
  - Server: `RolesGuard` validating Firebase decoded Bearer ID tokens, provisioning local `User` entities with roles (`CUSTOMER`, `ADMIN`, `MODERATOR`, `GUEST`).
- **Payment Processing:**
  - Server-side Razorpay SDK (`razorpay ^2.9.2`) creating orders and verifying cryptographic HMAC SHA-256 signatures via webhook and callback endpoints.
- **Hosting & Deployment:**
  - Frontend: Deployed on Vercel (`https://laptop-mitra.vercel.app/`).
  - Backend: Configured for Render (`https://laptopmitra-api.onrender.com`).

---

## 2. Inventory of Implemented Features in Revamped App

### 2.1 Frontend & User Interface (`apps/web`)

#### Component: Global Responsive Header & Modern Navigation
- **Implementation:** `apps/web/components/Navbar.tsx`
- **Behavior:**
  - Sticky glass header with brand logo, interactive category dropdown, predictive search bar, and direct action icons (User Profile, Wishlist with counter badge, Cart with counter badge).
  - Quick action CTA "Get a Quote" linking to WhatsApp.
  - Mobile slide-out navigation drawer with smooth backdrop blur.
- **Execution Level:** **Fully Implemented in UI** (Note: "Get a Quote" and "Warranty & Support" links route to placeholder WhatsApp number `+91 9999999999`).

#### Component: Homepage Marketing & Discovery Layout
- **Implementation:** `apps/web/app/page.tsx`
- **Sections Implemented:**
  - Hero Enterprise Hardware banner with callout badges and dual CTAs ("Explore Laptops", "Get a Quote").
  - Value propositions bar (100% Genuine Products, Bulk Orders, PAN India Delivery, Dedicated Support).
  - Category Grid (Business Laptops, Student Laptops, Gaming Laptops, Premium Series, Apple MacBooks) with dynamic query params (`/products?category=...`).
  - Flash Sale / "Deal of the Day" hero showcase with price comparison and instant checkout trigger.
  - Animated live counters (Devices Sold: 1500+, Corporate Clients: 27+, Satisfaction Rate: 95%, Experience: 2+ Yrs).
  - Infinite auto-scrolling brand logo marquee (HP, Dell, Lenovo, Apple, Asus, Acer).
  - Dynamic "Trending Inventory" toggle (Featured Models vs. New Arrivals).
  - B2B Bulk fleet procurement benefits card.
  - Customer review carousel (Google verified 4.9/5 star ratings).
  - FAQ accordion covering refurbishing standards, warranties, and delivery.
- **Execution Level:** **Fully Implemented UI with Dual Data Source** (uses backend API `/products?featured=true` with fallback to `MOCK_PRODUCTS` if API fails).

#### Component: Catalog & Multi-Faceted Product Filtering
- **Implementation:**
  - `apps/web/app/products/page.tsx`
  - `apps/web/components/FilterSidebar.tsx`
- **Filtering Capabilities:**
  - Brand selection, category selector, processor filter, RAM filter, price range slider, stock availability toggle, search query param, and sort ordering (price low/high, newest, featured).
- **Execution Level:** **Fully Implemented & Connected to API** with mock fallback.

#### Component: Product Details Page (PDP)
- **Implementation:** `apps/web/app/products/[id]/page.tsx`
- **Features Implemented:**
  - Multi-angle gallery preview with interactive thumbnails.
  - Grade certification badge (Grade A+ Pristine) and warranty badge.
  - Tabbed specification sheet: Technical Specs, 32-Point Inspection Checklist, What's in the Box, 1-Year Warranty terms, FAQs.
  - "Outright Purchase" vs. "Corporate Lease" procurement model tab switch.
  - Tiered wholesale pricing table (1–4 units, 5–9 units: 7% off, 10+ units: 15% off).
  - 6-digit Indian PIN code delivery checker.
  - "Add to Cart" and "Buy Now" triggers.
- **Execution Level:** **Partially Implemented / Incomplete Business Logic**:
  - The "Corporate Lease" tab toggles estimated monthly lease rate on screen, but clicking "Add to Cart" passes standard product object without lease mode.
  - RAM/SSD hardware upgrade options (+₹4,000 / +₹500) from PHP are missing.
  - Product inquiry WhatsApp share button does not attach the user's referral code.

#### Component: Cart Drawer & Cart Page
- **Implementation:**
  - `apps/web/app/cart/page.tsx`
  - `apps/web/lib/cart-context.tsx`
- **Features Implemented:**
  - Item listing, thumbnail, title, unit price, quantity increment/decrement, remove item, clear cart.
  - Summary sidebar: Subtotal, Estimated GST (18% inclusive), Free Express Delivery, Total.
  - PIN code serviceability check.
  - Promo code input (simulates validation for `FIRST500` or codes starting with `MITRA`).
- **Execution Level:** **Implemented but Incomplete**:
  - Extended Warranty Add-on toggle (+₹1,999) from PHP is completely missing.
  - Items do not carry `purchaseMode` ('sell' vs 'lease').
  - Promo code entered on Cart page is not linked to server-side `DiscountCode` / `Referral` validation API.

#### Component: Multi-Step Checkout Page
- **Implementation:** `apps/web/app/checkout/page.tsx`
- **Features Implemented:**
  - Multi-step accordion: Step 1 (Contact Info), Step 2 (Delivery Address), Step 3 (Payment Method).
  - Support for COD ("Cash on Delivery / Pay on Inspection") and Razorpay Online Payment.
  - Razorpay Checkout modal script integration (`https://checkout.razorpay.com/v1/checkout.js`).
  - Referral / Promo Code application with real-time discount deduction.
  - Order review summary and place order action.
- **Execution Level:** **Fully Implemented in Frontend & Connected to Backend API**.

#### Component: Customer Account & Profile
- **Implementation:**
  - `apps/web/app/account/page.tsx` (Account Dashboard)
  - `apps/web/app/account/profile/page.tsx` (Personal Info)
  - `apps/web/app/account/orders/page.tsx` (Order History)
  - `apps/web/app/account/addresses/page.tsx` (Saved Addresses)
  - `apps/web/app/account/referral/page.tsx` (Mitra Referral Hub)
  - `apps/web/app/account/warranty-support/page.tsx` (Support & Warranty Tickets)
  - `apps/web/app/account/security/page.tsx` (Password & Security)
- **Execution Level:**
  - Account Dashboard, Profile, Orders, Addresses: **Fully Implemented & Connected to API**.
  - Referral Hub: Displays stats, copyable link, payout ledger, but **lacks Bank/UPI submission forms and withdrawal request triggers**.
  - Warranty & Support: Renders ticket creation modal and chat view, connected to backend `support` module.

---

### 2.2 Backend API Architecture (`apps/api`)

#### Module: Authentication (`apps/api/src/auth/`)
- **Controllers & Endpoints:**
  - `POST /auth/sync`: Synchronizes Firebase user session with local Postgres database, creating user profile and auto-generating Mitra referral code if missing.
  - `GET /auth/profile`: Returns authenticated user profile, address, and referral code.
  - `PUT /auth/profile`: Updates name, phone, address, and date of birth.
- **Execution Level:** **Fully Implemented**.

#### Module: Product Catalog (`apps/api/src/modules/product/`)
- **Controllers & Endpoints:**
  - `GET /products`: Paginated product list with search, category, price range, featured, and new arrival filters.
  - `GET /products/:id`: Retrieves individual product by UUID or slug with full relation to category and images.
  - `POST /products`: Admin creation.
  - `PUT /products/:id`: Admin update.
  - `DELETE /products/:id`: Soft delete / discontinue.
- **Execution Level:** **Fully Implemented**.

#### Module: Cart & Wishlist (`apps/api/src/modules/cart/`, `wishlist/`)
- **Controllers & Endpoints:**
  - `GET /cart`: Authoritative server-side cart.
  - `POST /cart/items`: Add product item to cart.
  - `PUT /cart/items/:productId`: Update item quantity.
  - `DELETE /cart/items/:productId`: Remove item.
  - `DELETE /cart`: Clear cart.
  - `GET /wishlist`: List user wishlist.
  - `POST /wishlist/items`: Toggle/Add product to wishlist.
  - `DELETE /wishlist/items/:productId`: Remove from wishlist.
- **Execution Level:** **Fully Implemented** (with the limitation that Cart schema only stores `productId` and `quantity`, without `mode`, `configuration`, or `hasWarranty`).

#### Module: Orders & Checkout (`apps/api/src/modules/order/`)
- **Controllers & Endpoints:**
  - `POST /orders`: Validates cart items, verifies stock, checks idempotency key, resolves coupon or referral discounts, creates `Order` with items, creates initial `Delivery` record, and returns order payload.
  - `GET /orders`: Returns orders for authenticated customer with optional status filtering.
  - `GET /orders/:id`: Full order details with ownership verification.
  - `PUT /orders/:id/status`: Admin status transitions (`PENDING -> CONFIRMED -> SHIPPING -> DELIVERED -> CANCELLED -> REFUNDED`).
  - `PATCH /orders/:id/cancel`: User order cancellation (allowed only when status is PENDING or CONFIRMED).
  - `POST /orders/:id/return`: Submits return/replacement request.
  - `POST /orders/:id/reorder`: Adds past order items back into active cart.
  - `GET /orders/:id/invoice`: Computes tax invoice data (18% GST breakdown, company details).
  - `GET /orders/:id/track`: Returns delivery tracking number and carrier timeline.
- **Execution Level:** **Fully Implemented**.

#### Module: Payments & Razorpay (`apps/api/src/modules/payments/`)
- **Controllers & Endpoints:**
  - `POST /payments/create-order`: Invokes Razorpay API to generate `razorpayOrderId` and initial `Payment` record.
  - `POST /payments/verify`: Verifies HMAC SHA-256 signature using `RAZORPAY_KEY_SECRET`. On success, marks payment `COMPLETED` and order `CONFIRMED`.
  - `POST /payments/webhook`: Listens for Razorpay asynchronous webhooks (`payment.captured`, `payment.failed`, `order.paid`).
  - `POST /payments/refund`: Initiates partial or full refunds.
- **Execution Level:** **Fully Implemented & Verified**.

#### Module: Discounts & Unified Referral System (`apps/api/src/modules/discount/`)
- **Controllers & Endpoints:**
  - `POST /discounts/validate`: Validates promo codes and referral codes, checking expiration, max uses, and per-user limits.
  - `GET /discounts/referral-stats`: Returns referral code, tier, total earnings, friends joined count, and link clicks.
- **Execution Level:** **Partially Implemented**:
  - Handles discount redemption on checkout.
  - **Missing:** Affiliate banking details model (`affiliate_payment_details`), withdrawal request submission endpoint, and admin approval/rejection endpoints.

#### Module: Support Tickets (`apps/api/src/modules/support/`)
- **Controllers & Endpoints:**
  - `GET /support/tickets`: List user's support/warranty tickets.
  - `POST /support/tickets`: Create new ticket.
  - `GET /support/tickets/:id`: Ticket message thread.
  - `POST /support/tickets/:id/messages`: Send message in ticket.
- **Execution Level:** **Fully Implemented**.

#### Module: Admin Management (`apps/api/src/modules/admin/`)
- **Controllers & Endpoints:**
  - `GET /admin/dashboard`: Real-time KPI counts (orders, revenue, low stock count, active users).
  - `GET /admin/analytics`: Aggregated sales charts by date range.
  - `GET /admin/orders`: Filterable, paginated order list.
  - `GET /admin/orders/:id`: Full order inspection.
  - `PUT /admin/orders/:id/status`: Update order status.
  - `GET /admin/products`: Product catalog management.
  - `POST /admin/products`: Create product.
  - `PUT /admin/products/:id`: Update product.
  - `DELETE /admin/products/:id`: Delete product.
  - `GET /admin/users`: Customer management.
  - `PUT /admin/users/:id/status`: Suspend or activate user.
  - `GET /admin/settings`: Platform settings.
  - `PUT /admin/settings`: Update platform settings.
- **Execution Level:** **Implemented for standard ecommerce, but Missing legacy PHP features**:
  - CSV Bulk Inventory Import & Export is missing.
  - Affiliate Partners & Withdrawal approval/rejection is missing.
  - Offline/Phone Booking creator is missing.
  - Dispatch courier & tracking ID fields are not exposed in the status update modal.

---

## 3. Database Schema Comparison Summary

The revamped application uses PostgreSQL with Prisma ORM (`apps/api/prisma/schema.prisma`).

| Schema Entity | Revamped Prisma Model | Original PHP MySQL Table | Status & Alignment |
|---|---|---|---|
| **Users** | `User` (UUID, Firebase UID, email, phone, role, referralCode, referralEarnings) | `users` (`id`, `fullname`, `email`, `phone`, `password`, `otp_code`, `referral_code`) | **Modernized.** Uses Firebase identity; local business fields preserved. |
| **User Addresses** | `Address` (`id`, `userId`, `address`, `city`, `state`, `pincode`, `isDefault`) | Stored inlined in `users` and `bookings` | **Improved.** Normalized address book. |
| **Categories** | `Category` (`id`, `name`, `slug`, `parentId`) | Inferred from string columns in PHP | **Improved.** Structured category hierarchy. |
| **Products / Laptops** | `Product` (`id`, `name`, `slug`, `price`, `compareAtPrice`, `sku`, `stock`, `metadata`) | `laptops` (`id`, `brand`, `model`, specs, `price_individual_sell`, `price_individual_lease`, `price_bulk_sell`, `price_bulk_lease`) | **Incomplete Alignment.** Revamped schema lacks separate columns for Lease and Bulk prices; relies on flexible JSON metadata. |
| **Product Images** | `ProductImage` (`id`, `productId`, `url`, `isPrimary`, `sortOrder`) | `laptop_images` (`id`, `laptop_id`, `image_path`) | **Aligned.** |
| **Cart Items** | `CartItem` (`id`, `cartId`, `productId`, `quantity`, `priceAtAdd`) | `cart` (`id`, `user_id`, `laptop_id`, `quantity`, `purchase_mode`, `configuration`, `has_warranty`) | **Gap Identified.** Revamped `CartItem` lacks `purchaseMode`, `configuration`, and `hasWarranty`. |
| **Orders / Bookings** | `Order`, `OrderItem`, `Delivery`, `Payment` | `bookings` (`id`, `laptop_id`, `customer_name`, `purchase_type`, `quantity`, `mode`, `courier_name`, `tracking_id`, `status`) | **Modernized.** Normalized multi-item order architecture. |
| **Referrals & Discounts** | `DiscountCode`, `Referral`, `DiscountRedemption`, `ReferralRedemption` | `coupon_usage`, `affiliate_earnings` | **Partially Aligned.** Discount redemption is handled, but affiliate payout requests and bank details are not modeled. |
| **Affiliate Payouts** | *None* | `affiliate_payment_details`, `withdrawal_requests` | **Missing in Revamped Schema.** |
| **Buyback Records** | *None* | Covered via terms and manual service | **Missing Formalization.** |
