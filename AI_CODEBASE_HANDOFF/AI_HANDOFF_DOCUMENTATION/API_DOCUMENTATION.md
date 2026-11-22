# LaptopMitra — AI Handoff: API Documentation

This document describes all API endpoints implemented across the NestJS controllers in `apps/api/src`.

---

## 1. Authentication & System Health

### System Health (`app.controller.ts`)
- **GET `/health`**
  - **Auth**: Public (`@Public()`)
  - **Purpose**: Liveness probe for hosting monitors (Render / AWS).
  - **Response**: `{ status: "ok", timestamp: string }`
- **GET `/health/ready`**
  - **Auth**: Public (`@Public()`)
  - **Purpose**: Readiness probe; checks active database connection and Firebase Admin status.
  - **Response**: `{ status: "ok", database: "connected", timestamp: string }`

### Authentication (`auth/auth.controller.ts`)
- **POST `/auth/sync`**
  - **Auth**: Authenticated with unlinked token allowed (`@AllowUnlinkedFirebaseUser()`)
  - **Purpose**: Creates or retrieves the local PostgreSQL `User` record matching the verified `firebaseUid`.
  - **Request Body**: `{ name?: string, email?: string, phone?: string, referralCode?: string }`
  - **Response**: `{ user: UserProfile, isNewUser: boolean }`
- **POST `/auth/guest`**
  - **Auth**: Public
  - **Purpose**: Creates an anonymous guest user profile for unauthenticated cart browsing.
  - **Response**: `{ guestId: string, token: string }`
- **POST `/auth/link-guest`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Purpose**: Merges anonymous guest items into the authenticated customer's cart.
  - **Request Body**: `{ guestId: string }`
  - **Response**: `{ success: true, itemsMerged: number }`
- **POST `/auth/otp/send-verification`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Purpose**: Generates and emails a 6-digit cryptographic verification code.
  - **Response**: `{ success: true, message: "Verification code sent", cooldownSeconds: 60 }`
- **POST `/auth/otp/verify-email`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Purpose**: Validates submitted OTP and sets `User.emailVerified = now()`.
  - **Request Body**: `{ code: string }`
  - **Response**: `{ success: true, verified: true }`
- **POST `/auth/otp/forgot-password`**
  - **Auth**: Public
  - **Purpose**: Initiates password reset for a registered email.
  - **Request Body**: `{ email: string }`
  - **Response**: `{ success: true, message: "Reset code sent if email exists" }`
- **POST `/auth/otp/verify-reset-code`**
  - **Auth**: Public
  - **Purpose**: Pre-validates reset code before prompting for new password.
  - **Request Body**: `{ email: string, code: string }`
  - **Response**: `{ valid: true }`
- **POST `/auth/otp/reset-password`**
  - **Auth**: Public
  - **Purpose**: Consumes reset code and updates credentials in Firebase Auth.
  - **Request Body**: `{ email: string, code: string, newPassword: string }`
  - **Response**: `{ success: true }`

---

## 2. Product Catalog & Categories

### Products (`modules/product/product.controller.ts`)
- **GET `/products`**
  - **Auth**: Public
  - **Query Params**: `page`, `limit`, `search`, `category`, `brand`, `processor`, `ram`, `storage`, `minPrice`, `maxPrice`, `sortBy`, `sortOrder`.
  - **Response**: `{ products: Product[], total: number, page: number, totalPages: number, facets: ProductFilterFacets }`
- **GET `/products/filters`**
  - **Auth**: Public
  - **Purpose**: Returns dynamic facet counts for frontend filter sidebars.
  - **Response**: `{ brands: FacetItem[], processors: FacetItem[], ramOptions: FacetItem[], storageOptions: FacetItem[], priceRange: { min: number, max: number } }`
- **GET `/products/:id`**
  - **Auth**: Public
  - **Purpose**: Retrieves product by ID or URL slug with all variants, images, and rental price matrices.
  - **Response**: `ProductWithDetails`

### Categories (`modules/categories/categories.controller.ts`)
- **GET `/categories`**
  - **Auth**: Public
  - **Purpose**: Returns complete category hierarchy with subcategories and product counts.
  - **Response**: `Category[]`
- **GET `/categories/slug/:slug`**
  - **Auth**: Public
  - **Response**: `CategoryWithChildren`

---

## 3. Cart & Wishlist

### Cart (`modules/cart/cart.controller.ts`)
- **GET `/cart`**
  - **Auth**: Authenticated (`CUSTOMER` or `GUEST`)
  - **Response**: `{ id: string, items: CartItem[], subtotal: number, itemCount: number }`
- **POST `/cart/items`**
  - **Auth**: Authenticated
  - **Request Body**: `{ productId: string, variantId?: string, quantity: number }`
  - **Response**: `CartResponse`
- **PUT `/cart/items/:itemId`**
  - **Auth**: Authenticated
  - **Request Body**: `{ quantity: number }`
  - **Response**: `CartResponse`
- **DELETE `/cart/items/:itemId`**
  - **Auth**: Authenticated
  - **Response**: `CartResponse`
- **DELETE `/cart`**
  - **Auth**: Authenticated
  - **Purpose**: Empties all items from the active cart.

### Wishlist (`modules/wishlist/wishlist.controller.ts`)
- **GET `/wishlist`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Response**: `WishlistItem[]`
- **POST `/wishlist/items`**
  - **Auth**: Authenticated
  - **Request Body**: `{ productId: string }`
  - **Response**: `WishlistItem`
- **DELETE `/wishlist/items/:itemId`**
  - **Auth**: Authenticated
  - **Response**: `{ success: true }`

---

## 4. Orders, Checkout & Shipping

### Orders (`modules/order/order.controller.ts`)
- **POST `/orders`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Purpose**: Creates order, verifies stock, applies 15-minute reservation, calculates tax (GST), applies coupon/referral, and creates Razorpay gateway order.
  - **Request Body**: `{ addressId: string, couponCode?: string, referralCode?: string, paymentProvider: "RAZORPAY" | "COD" }`
  - **Response**: `{ order: Order, razorpayOrder?: RazorpayOrderPayload }`
- **GET `/orders`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Query Params**: `page`, `limit`, `status`
  - **Response**: `{ orders: OrderSummary[], total: number }`
- **GET `/orders/counts`**
  - **Auth**: Authenticated
  - **Response**: `{ active: number, completed: number, cancelled: number, total: number }`
- **GET `/orders/:id`**
  - **Auth**: Authenticated (Owner or Admin)
  - **Response**: `OrderDetailWithItemsAndTracking`
- **PATCH `/orders/:id/cancel`**
  - **Auth**: Authenticated (Owner or Admin)
  - **Purpose**: Cancels an entire unfulfilled order and releases reserved stock.
  - **Request Body**: `{ reason: string }`
  - **Response**: `{ success: true, status: "CANCELLED" }`
- **POST `/orders/:id/items/:itemId/cancel`**
  - **Auth**: Authenticated (Owner or Admin)
  - **Purpose**: Granular item-level cancellation with automatic partial refund calculation.
  - **Request Body**: `{ reason: string }`
  - **Response**: `OrderItemCancellationResponse`
- **GET `/orders/:id/invoice`**
  - **Auth**: Authenticated (Owner or Admin)
  - **Purpose**: Generates and streams a GST-compliant tax invoice PDF.

### Shipping & Pincodes (`modules/shipping/shipping.controller.ts`)
- **GET `/shipping/pincode/:pincode`**
  - **Auth**: Public
  - **Purpose**: Verifies delivery serviceability, estimated delivery days, and COD availability for an Indian pincode.
  - **Response**: `{ pincode: string, serviceable: boolean, city: string, state: string, estimatedDays: number, codAvailable: boolean }`

---

## 5. Payments & Razorpay Integration (`modules/payments/payment.controller.ts`)

- **POST `/payments/razorpay/order`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Request Body**: `{ orderId: string }`
  - **Response**: `{ keyId: string, amountPaise: number, currency: "INR", razorpayOrderId: string }`
- **POST `/payments/razorpay/verify`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Purpose**: Verifies HMAC-SHA256 signature (`razorpay_order_id|razorpay_payment_id`) against `RAZORPAY_KEY_SECRET`, captures payment, marks order `CONFIRMED`, and provisions digital sold units and warranty records.
  - **Request Body**: `{ razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string, orderId: string }`
  - **Response**: `{ success: true, orderId: string, paymentStatus: "CAPTURED" }`
- **POST `/payments/razorpay/webhook`**
  - **Auth**: Public (Guarded by Razorpay HMAC Webhook Signature Header)
  - **Purpose**: Asynchronous reconciliation for `order.paid`, `payment.failed`, `subscription.charged`.
  - **Response**: `{ status: "ok" }`
- **GET `/payments/history`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Response**: `PaymentRecord[]`

---

## 6. Discounts & Mitra Affiliate Program (`modules/discount/discount.controller.ts`)

- **POST `/discount/validate`** (also aliased under `/coupons/validate`)
  - **Auth**: Authenticated
  - **Request Body**: `{ code: string, cartTotal: number }`
  - **Response**: `{ valid: boolean, discountType: string, discountAmount: number, message: string, isReferral: boolean }`
- **GET `/discount/referral/stats`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Purpose**: Fetches affiliate dashboard metrics: referral code, total clicks, total conversions, earnings breakdown (`referralEarnings`, `referralReserved`, `referralWithdrawn`), current tier, and withdrawal history.
  - **Response**: `ReferralDashboardStats`
- **GET `/discount/payout-details`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Purpose**: Returns saved bank account/UPI info with sensitive fields masked (e.g. `****1234`).
- **POST `/discount/payout-details`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Purpose**: Encrypts and persists banking / UPI payment details using AES-256-GCM.
  - **Request Body**: `{ accountHolderName: string, bankName: string, accountNumber: string, ifscCode: string, upiId?: string }`
  - **Response**: `{ success: true }`
- **POST `/discount/withdraw`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Purpose**: Atomically locks requested amount in `referralReserved` via interactive transaction and creates a `WithdrawalRequest`.
  - **Request Body**: `{ amount: number }`
  - **Response**: `{ id: string, amount: number, status: "PENDING", createdAt: string }`

---

## 7. Device Passport, AMC & Warranty (`modules/service/service.controller.ts`)

- **GET `/account/laptops`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Purpose**: Lists all registered devices owned by customer with serial numbers, warranty status, and service entitlements.
  - **Response**: `SoldUnitWithWarrantyDto[]`
- **GET `/account/laptops/:unitId`**
  - **Auth**: Authenticated
  - **Response**: `SoldUnitDetailDto`
- **POST `/account/laptops/:unitId/service-bookings`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Purpose**: Books a doorstep technician visit; assigns sequential job number (`SRV-YYYYMM-XXXXX`).
  - **Request Body**: `{ serviceType: string, scheduledDate: string, timeSlot: string, addressId: string, notes?: string }`
  - **Response**: `ServiceJobDto`
- **GET `/account/service-jobs`**
  - **Auth**: Authenticated
  - **Response**: `ServiceJobSummaryDto[]`
- **POST `/account/service-jobs/:id/reschedule`**
  - **Auth**: Authenticated
  - **Request Body**: `{ scheduledDate: string, timeSlot: string, reason: string }`
  - **Response**: `ServiceJobDto`
- **POST `/account/service-jobs/:id/cancel`**
  - **Auth**: Authenticated
  - **Request Body**: `{ reason: string }`
  - **Response**: `{ success: true }`

---

## 8. Support Helpdesk & Buyback (`modules/support/support.controller.ts`)

- **GET `/support/items/:orderItemId/situation`**
  - **Auth**: Authenticated
  - **Purpose**: Evaluates item lifecycle and returns permissible contextual actions (`REQUEST_RETURN`, `EXTEND_LEASE`, `BOOK_SERVICE`, `BUYOUT_LEASE`, `CLAIM_WARRANTY`, `BUYBACK`).
  - **Response**: `SituationResponse`
- **GET `/support/tickets`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Response**: `SupportTicketSummary[]`
- **POST `/support/tickets`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Request Body**: `{ category: string, subject: string, description: string, orderId?: string, priority?: string }`
  - **Response**: `SupportTicketDetail`
- **POST `/support/tickets/:id/messages`**
  - **Auth**: Authenticated
  - **Request Body**: `{ message: string, attachmentUrls?: string[] }`
  - **Response**: `TicketMessage`
- **POST `/support/buyback/requests`**
  - **Auth**: Authenticated (`CUSTOMER`)
  - **Purpose**: Initiates buyback evaluation based on original laptop purchase price and tenure.
  - **Request Body**: `{ orderItemId: string, declaredCondition: string, notes?: string }`
  - **Response**: `BuybackRequestDto`

---

## 9. Administrative Consoles (`modules/admin/*`)

All `/admin/*` routes are protected with `@Roles('ADMIN', 'MODERATOR')` via `RolesGuard`.

- **GET `/admin/dashboard/stats`**: Core KPI summary (Gross revenue, net margin, pending orders, active repairs).
- **GET `/admin/users`**: Paginated customer list with role filters and account status toggles (`ACTIVE` / `SUSPENDED`).
- **GET `/admin/users/:id/360`**: Unified view of customer orders, tickets, devices, and affiliate balances.
- **GET `/admin/products` / POST `/admin/products` / PUT `/admin/products/:id` / DELETE `/admin/products/:id`**: Full catalog management.
- **POST `/admin/products/import/csv` & GET `/admin/products/export/csv`**: Bulk CSV inventory data exchange.
- **GET `/admin/orders` & PUT `/admin/orders/:id/status`**: Order dispatch and carrier assignment.
- **POST `/admin/orders/:id/refund`**: Automated gateway refund processing.
- **GET `/admin/affiliates`**: Mitra partner earnings and pending withdrawal requests.
- **GET `/admin/withdrawals/:id/payment-details`**: Decrypts user banking details for approved bank transfers.
- **PUT `/admin/withdrawals/:id/status`**: Updates withdrawal status (`APPROVED`, `PAID`, `REJECTED`).
- **GET `/admin/service/units` & POST `/admin/service/units/:id/serial`**: Assigns and verifies hardware serial numbers.
- **GET `/admin/service/jobs` & PUT `/admin/service/jobs/:id`**: Assigns technicians to service visits.
