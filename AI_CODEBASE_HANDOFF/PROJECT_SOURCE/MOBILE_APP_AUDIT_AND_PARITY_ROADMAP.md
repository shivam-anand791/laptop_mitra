# LaptopMitra: Mobile App Audit, Web Parity & API Wiring Roadmap

**Date:** November 2026  
**Scope:** `apps/mobile` (Expo React Native) vs `apps/web` (Next.js 15) vs `packages/api-client` (Universal API)  
**Status:** Audit Complete  

---

## 1. Executive Summary

The LaptopMitra mobile application (`apps/mobile`) has a mature base with 26+ screens, working Razorpay checkout, background cart-sync retries, push notification token registration, and comprehensive support ticketing and return flows.

However, when compared against the completed web application (`apps/web`), the mobile application exhibits:
1. **First-Time User Friction:** Initial app boot forces an authentication wall (`RootNavigator.tsx`), preventing unauthenticated visitors from exploring the catalog without logging in.
2. **Missing Account Hub Screens:** 5 dedicated customer management screens present on web (`/account/payments`, `/account/notifications`, `/account/returns` list, `/account/service-jobs` list, `/account/warranty-support`) are absent on mobile.
3. **Orphaned / Unwired API Hooks:** 7 hooks defined in `apps/mobile/src/hooks/useApi.ts` are declared but never imported or invoked in any screen.
4. **Mitra Affiliate Dashboard Under-Implementation:** Mobile only displays basic read-only profile metrics, lacking bank/UPI payout configuration, withdrawal request modals, and payout ledger tracking.
5. **Store Filter Disparity:** Mobile filter modal uses single-selection radios and client-side page-scoped filtering instead of multi-select facets with server-side queries.
6. **Navigation Broken Links:** Critical actions (such as tapping a category on Home or clicking "Buy Now" on Product Details) do not navigate to their intended destinations.

---

## 2. Web vs. Mobile Feature Parity Matrix

| Feature / Screen Group | Web Experience (`apps/web`) | Mobile Current State (`apps/mobile`) | Parity Status | Required Action |
| :--- | :--- | :--- | :--- | :--- |
| **Guest / Public Browsing** | Full unauthenticated access to Home, Catalog, Filters, PDP, Terms, About, Help | Locked behind `AuthStack` in `RootNavigator.tsx` unless guest anonymous login is chosen | ⚠️ Partial | Allow default `MainStack` browsing; trigger auth on Checkout, Wishlist, Account |
| **Home Screen Categories** | Clicking category filters store catalog by that category | Tapping category runs `navigation.navigate('MainTabs')` without selecting Store or filtering | ❌ Broken | Route to Store tab and pass `{ categoryId }` |
| **Store & Catalog Filters** | Multi-select Brands, Processors, RAM, Storage, Condition/Grade (A+, A, B), Price ranges, Buy vs Lease | Single-select Brand, RAM, Storage; no Processors, Grades, or Listing Type filters | ⚠️ Incomplete | Align `FilterModal.tsx` with web facets; pass filters to `useProducts` query params |
| **Product Detail (PDP)** | Gallery zoom, full specs, variant picker, inline PIN check widget, Buy Now direct to checkout | Gallery carousel, variants, buy vs lease, corporate quote modal | ⚠️ Broken Action | "Buy Now" navigates to Home tab; wire directly to `Checkout` screen |
| **Cart & Pricing Breakdown** | Full coupon drawer, Delhi NCR COD check, warranty add-on toggle, AutoPay notice | Coupon modal, warranty toggle, sync retry queue, Delhi NCR COD check |  Complete | Matches web logic and tokens |
| **Checkout & Razorpay** | 3-step checkout, Razorpay modal / UPI, Delhi NCR COD enforcement | Custom `RazorpayCheckoutModal`, subscription mandates, address selector |  Complete | Matches web logic and tokens |
| **Orders List** | Status tabs (`All`, `In Progress`, `Delivered`, `Cancelled`, `Returns`) with counts, search, date filter, thumbnails, quick actions | Plain order cards with `#orderNumber`, no thumbnails, no status tabs, no quick actions | ⚠️ Incomplete | Upgrade to Flipkart-style order cards with search and status tabs |
| **Order Details** | Timeline tracker, item specs, cancel modal, return modal, invoice download, situation help | Timeline tracker, invoice modal, return modal, item situation modal |  Complete | Matches web capabilities |
| **Payment History** | Dedicated `/account/payments` page (Transaction ID, payment mode, date, amount, order link) | Completely missing from navigation and UI | ❌ Missing | Create `PaymentHistoryScreen.tsx` wired to `usePaymentHistory()` |
| **Notification Preferences** | Dedicated `/account/notifications` page (Email, SMS, Push toggles for orders, deals, alerts) | Completely missing from navigation and UI | ❌ Missing | Create `NotificationPreferencesScreen.tsx` wired to `useNotificationPreferences()` |
| **Returns Hub** | `/account/returns` (list of all returns) & `/account/returns/[id]` | Only `ReturnDetailScreen.tsx` exists (only reachable directly after filing a return) | ❌ Missing | Create `ReturnsListScreen.tsx` to view and track past return requests |
| **Service Appointments** | `/account/service-jobs` (list of appointments) & `[id]` | Has `ServiceJobDetailScreen.tsx` but no list screen | ❌ Missing | Create `ServiceJobsListScreen.tsx` wired to `useUserServiceJobs()` |
| **Warranty & Support Hub** | `/account/warranty-support` | Informational static `BuybackGuaranteeScreen` only | ⚠️ Incomplete | Add Warranty & Claims summary tab inside Account |
| **Mitra Affiliate Program** | Earnings summary, bank/UPI payout details form, withdrawal request modal, payout history | Static tier card, total earned, click count, share buttons | ❌ Severe Gap | Rebuild `MitraDashboardScreen.tsx` to include payout setup, withdrawals, and ledger |

---

## 3. API Wiring Audit & Orphan Hooks

The mobile API integration layer ([useApi.ts](file:///c:/vloume d/laptopmitra/apps/mobile/src/hooks/useApi.ts)) defines complete wrappers around `@laptopmitra/api-client`. The following hooks are currently defined but **orphaned** (never imported or called across any mobile component):

| Orphan Hook | Underlying API Client Call | Missing Mobile Touchpoint |
| :--- | :--- | :--- |
| `usePaymentHistory()` | `client.getPaymentHistory()` | No screen exists to view customer payment transactions |
| `useNotificationPreferences()` | `client.getNotificationPreferences()` | No screen exists to view notification channels |
| `useUpdateNotificationPreferences()` | `client.updateNotificationPreferences()` | No screen exists to update notification preferences |
| `useUserServiceJobs()` | `client.getUserServiceJobs()` | No list screen exists for past/scheduled doorstep service appointments |
| `useReferralStats()` | `client.getReferralStats()` | `MitraDashboardScreen.tsx` currently only reads basic fields from `useProfile` |
| `useCustomerBuybacks()` | `client.getCustomerBuybacks()` | No customer list screen to view submitted 36-month buyback requests |
| `useBuybackById()` | `client.getBuybackById()` | Customer cannot view detailed status of an existing buyback request |
| `useAcceptRevisedBuyback()` | `client.acceptRevisedBuybackOffer()` | Customer cannot accept revised counter-offers on mobile |
| `useDeclineRevisedBuyback()` | `client.declineRevisedBuybackOffer()` | Customer cannot decline revised counter-offers on mobile |
| `useCustomerChangeRequests()` | `client.getCustomerChangeRequests()` | Customer cannot track submitted address/item change requests |

---

## 4. Specific UX & Navigation Defects Identified

### A. Root Navigation Auth Gate
- **Location:** `apps/mobile/src/navigation/RootNavigator.tsx` (Lines 28–33)
- **Problem:** If `isAuthenticated` is false, the app unconditionally presents `AuthStack` (`LoginScreen`). First-time visitors cannot browse products or explore the store without logging in.
- **Fix:** Keep `MainStack` as the default screen. Protect only authenticated mutations and personal views (Checkout, Add to Wishlist, Order History, Personal Information).

### B. Category Navigation Dead-End
- **Location:** `apps/mobile/src/screens/main/HomeScreen.tsx` (Lines 90–98)
- **Problem:**
  ```tsx
  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => {
        // Navigate to store tab
        navigation.navigate('MainTabs');
      }}
    >
  ```
  Tapping a category fails to switch to the `Store` tab and fails to pass the selected category filter.
- **Fix:** Update navigation call to:
  ```tsx
  navigation.navigate('MainTabs', {
    screen: 'Store',
    params: { categoryId: item.id },
  });
  ```

### C. "Buy Now" Action Dead-End
- **Location:** `apps/mobile/src/screens/main/ProductDetailScreen.tsx` (Lines 140–144)
- **Problem:**
  ```tsx
  const handleBuyNow = () => {
    handleAddToCart(() => {
      navigation.navigate('MainTabs');
    });
  };
  ```
  Tapping "Buy Now" adds the laptop to the cart and drops the user on the Home screen instead of proceeding to Checkout.
- **Fix:** Update callback to navigate directly to `Checkout`:
  ```tsx
  const handleBuyNow = () => {
    handleAddToCart(() => {
      navigation.navigate('Checkout');
    });
  };
  ```

### D. Client-Side Store Filtering Bug
- **Location:** `apps/mobile/src/screens/main/StoreScreen.tsx` (Lines 170–187)
- **Problem:** `StoreScreen` fetches 20 products from the server and performs brand, RAM, and storage filtering client-side on that single page. If matching items exist on page 2 or 3, the user sees an empty list or missing results.
- **Fix:** Forward `brand`, `ram`, `storage`, `minPrice`, `maxPrice`, and `categoryId` as query parameters to `useProducts(params)` for server-side evaluation.

---

## 5. UI/UX Optimization Recommendations for Mobile

To deliver a high-leverage, native mobile experience:

1. **Native Gesture Bottom Sheets over Centered Modals:**
   - Replace full-screen or centered `<Modal>` elements (`FilterModal`, `CouponOffersModal`, `ItemSituationHelpModal`, `CorporateQuoteModal`) with fluid bottom sheets that support drag-to-dismiss.
2. **Order Cards with Flipkart / Myntra Architecture:**
   - Add product thumbnails (stacked thumbnails for multi-item orders).
   - Display a single clean status chip with plain-language labels (`Order Placed`, `Confirmed`, `Shipped`, `Delivered`, `Cancelled`).
   - Add direct touch targets: **Track**, **View Details**, **Invoice**, and **Need Help**.
3. **Skeleton Loaders:**
   - Replace generic centered `<ActivityIndicator>` spinners in `OrderHistoryScreen`, `TicketListScreen`, `AddressBookScreen`, and `WishlistScreen` with lightweight skeleton placeholders to reduce perceived load time.
4. **Haptic Feedback Integration:**
   - Integrate `expo-haptics` on key user moments: Add to Cart, Toggle Wishlist, Copy Coupon / Referral Code, and Successful Payment Confirmation.
5. **Inline PIN Code Delivery Check on PDP:**
   - Add an inline pincode delivery verification input on `ProductDetailScreen` (matching web) so buyers know COD eligibility and delivery turnaround before initiating checkout.

---

## 6. Phased Implementation Roadmap

### Phase 1: Core Navigation & Public Browsing (Completed)
- [x] Remove mandatory auth wall from `RootNavigator.tsx`; enable open catalog browsing.
- [x] Fix Category navigation from `HomeScreen` to `Store` tab with filter prefill.
- [x] Fix "Buy Now" on `ProductDetailScreen` to navigate directly to `Checkout`.
- [x] Update `StoreScreen` to pass filter parameters to server-side queries.

### Phase 2: Missing Account Screens & API Wiring (Completed)
- [x] **Payments:** Create `PaymentHistoryScreen.tsx` wired to `usePaymentHistory()`.
- [x] **Notifications:** Create `NotificationPreferencesScreen.tsx` wired to `useNotificationPreferences()` and `useUpdateNotificationPreferences()`.
- [x] **Returns:** Create `ReturnsListScreen.tsx` wired to `useReturns()` and link to `ReturnDetailScreen.tsx`.
- [x] **Service Jobs:** Create `ServiceJobsListScreen.tsx` wired to `useUserServiceJobs()`.
- [x] Add menu rows in `AccountScreen.tsx` for Payments, Returns, Service Jobs, and Notifications.

### Phase 3: Mitra Affiliate Dashboard Overhaul (Completed)
- [x] Wire `useReferralStats()` into `MitraDashboardScreen.tsx` for real-time earnings, reserved balance, and available balance.
- [x] Implement Bank Account / UPI ID setup form using `getPayoutDetails()` and `savePayoutDetails()`.
- [x] Implement "Request Payout" modal with ₹500 minimum validation and backend balance checks.
- [x] Implement Payout History ledger table showing transaction dates, status, UTR numbers, and admin remarks.

### Phase 4: Order History Redesign & Native Polish (Completed)
- [x] Upgrade `OrderHistoryScreen.tsx` with status filter chips (`All`, `In Progress`, `Delivered`, `Cancelled`, `Returns`) with count badges.
- [x] Add search by order number or product name with instant debounced clearing.
- [x] Add product thumbnails and quick-action touch targets on order cards (`Track & Details`, `Invoice`, `Cancel`, `Buy Again`).
- [x] Add inline PIN code express delivery and COD verification widget on PDP (`ProductDetailScreen.tsx`).
- [x] Verify complete monorepo type safety and test coverage (10 test suites, 98 tests passing).

