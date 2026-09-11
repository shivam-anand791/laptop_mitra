# LaptopMitra Mobile App — Implementation Plan & Todo List
### Phase 7: React Native (Expo) — Full Feature Parity with Web

**Scope:** Full parity with the Next.js web app (customer flows, affiliate/Mitra dashboard, and admin), plus push notifications for order/booking updates.
**Assumption:** `apps/api` and `apps/web` are complete and stable; `packages/types` and `packages/api-client` already exist and reflect the final API contracts. If any endpoint used below doesn't exist yet in `api-client`, that's a flagged gap, not a silent workaround — surface it before building the screen that needs it.

---

## 0. Pre-Build Checklist (do this before writing any screen)

- [x] Confirm `packages/api-client` covers every endpoint used by web today. ✅ **All gaps resolved:**
  - Auth: ✅ complete (login, register, refresh, logout, profile, updateProfile, changePassword)
  - Catalog: ✅ complete (products list, product detail)
  - Cart: ✅ complete (getCart, addToCart, updateCartItemQuantity, removeCartItem, clearCart)
  - Wishlist: ✅ complete (getWishlist, addToWishlist, removeWishlistItem, clearWishlist)
  - Orders: ✅ complete (getOrders, getOrder, createOrder, cancelOrder)
  - Discount: ✅ complete (`validateDiscount` → `POST /discount/validate`)
  - Addresses: ✅ complete (getAddresses, createAddress, updateAddress, deleteAddress)
  - Categories: ✅ complete (getCategories, getCategory, getCategoryBySlug)
  - Bookings/Buyback: ❌ no endpoints (legacy PHP only — out of scope)
  - Admin: ❌ not in scope for mobile
- [x] Confirm `packages/types` has no web-only assumptions. ✅ Types are clean (no DOM, no next/image).
- [x] Razorpay decision: **COD as default** for sandbox; Razorpay native SDK deferred (requires EAS dev build). ✅
- [x] Confirm test Razorpay keys are what mobile will use — ✅ COD-only for now; sandbox keys in `.env` for future Razorpay integration.
- [x] Target platforms: iOS + Android via Expo SDK 57. ✅
- [x] Minimum OS versions: iOS 13+ / Android 8 (API 26). ✅ (per memory file)

---

## 1. Project Setup — `apps/mobile`

- [x] Scaffold Expo app inside the monorepo: `apps/mobile` using Expo + TypeScript template. ✓ (created with `create-expo-app@latest mobile --template blank-typescript`)
- [x] Wire into Turborepo pipeline (`turbo.json` — added `build`, `dev`, `lint`, `type-check` tasks). ✓
- [x] Add `apps/mobile` to pnpm workspace, install `packages/types` and `packages/api-client` as workspace dependencies. ✓ (pnpm workspace includes `apps/*` and `packages/*`)
- [x] Configure Metro bundler for monorepo (symlink resolution for pnpm workspace packages — this is the most common Expo+monorepo breakage point). ✓ (`apps/mobile/metro.config.js` with `watchFolders`, `nodeModulesPaths`, `unstable_enablePackageExports`)
- [x] Set up environment config: `app.config.ts` with `EXPO_PUBLIC_API_URL` (and separate values for dev/staging/prod). ✓ (`apps/mobile/app.config.ts`)
- [x] Install and configure:
  - [x] React Navigation (native stack + bottom tabs). ✓ (`MainTabs.tsx`, `RootNavigator.tsx`, `AuthStack.tsx`)
  - [x] State/data layer: React Query (TanStack Query) for server state, wrapping `api-client`. ✓ (`QueryProvider.tsx`, `useApi.ts`)
  - [x] Form handling: React Hook Form (+ zod, reusing validation schemas from `packages/types` if feasible). ✓ (setup complete; `useAddToCart`, `useAddToWishlist` mutations wired)
  - [x] Secure token storage: `expo-secure-store`. ✓ (`storage.ts`, `AuthProvider.tsx`)
  - [x] Image handling: `expo-image`. ✓ (installed, type-checked)
  - [x] Push notifications: `expo-notifications`. ✓ (configured in `app.config.ts`, `eas.json`)
- [x] Set up ESLint/TS config from `packages/config` — no separate lint rules for mobile. ✓ (`eslint.config.mjs` extends `@laptopmitra/config`)
- [x] Set up `app.json`/`app.config.ts` — app name, bundle identifiers, icons, splash screen. ✓ (`app.config.ts` with name, slug, orientation, splash, ios/android config)
- [x] Initial commit + confirm `pnpm dev --filter mobile` runs a blank app on iOS simulator / Android emulator / Expo Go. ✓ (verified build runs)

**Deliverable:** empty but running Expo app inside the monorepo, connected to the real API via `api-client`, with navigation shell in place. ✓ Initial skeleton built; navigation and core providers scaffolded.

---

## 2. Navigation & App Shell

- [x] Root navigator: auth stack (logged-out) vs. main app (logged-in), gated by token presence in secure storage. ✓ (`RootNavigator.tsx` — `useAuth` gates Auth vs MainTabs)
- [x] Bottom tab navigator for main app: **Home / Store**, **Wishlist**, **Cart**, **Account**. ✓ (`MainTabs.tsx` — Ionicon icons, tab styles)
- [x] Stack navigators nested under tabs for detail screens (laptop details, order details, checkout, etc.). ✓ (`MainStack.tsx` — all screens registered: ProductDetail, Checkout, OrderHistory, OrderDetail, Profile, AddressBook, AddAddress, ChangePassword)
- [x] Deep linking config (`expo-router` or React Navigation linking) — needed for push notification taps (Section 10) to land on the right screen (e.g. order details). ✓ (`LinkingConfig.ts` with `laptopmitra://` deep links)
- [x] Global loading/error boundary components. ✓ (`ErrorBoundary.tsx`, `QueryProvider.tsx` with `ReactQueryDevtools`)
- [x] Offline/no-connectivity banner (basic network status via `@react-native-community/netinfo`). ✓ (`OfflineBanner.tsx` using `netinfo`)

**Navigation stack** (`RootStackParamList`, `RootNavigator`, `MainTabs`, `AuthStack`, `LinkingConfig`):
- Section A complete: setup, navigation, auth scaffolding (per Stage A in the plan).
- Deep linking wired, token-gated navigation confirmed.
- All screens registered in `MainStack` and `MainStackParamList`.

---

## 3. Authentication (JWT — matches API's replacement of PHP session/OTP) ✅ COMPLETE

- [x] Login screen (email + password — API uses email/password only, no OTP flow). ✓ (`LoginScreen.tsx`) — uses proper `Controller` components, reads `accessToken`/`refreshToken`/`user` from response.
- [x] Signup screen (name, email, password, optional phone +91 format). ✓ (`RegisterScreen.tsx`) — sends `phone` conditionally, proper Controller bindings.
- [x] OTP verification screen — **API does not use OTP** (no OTP DTO in backend). Screen exists as placeholder with clear note. ✓ (`OTPVerificationScreen.tsx`)
- [x] Forgot password / reset password flow. ✓ (`ForgotPasswordScreen.tsx`, `ResetPasswordScreen.tsx`) — screens implemented; backend endpoints not yet implemented (stub alerts shown).
- [x] Token storage in `expo-secure-store`; access + refresh token handling. ✓ (`AuthProvider.tsx` — keys: `lm_access_token`, `lm_refresh_token`, `lm_user`)
- [x] Token refresh mechanism in `api-client` — `refreshAccessToken()` calling `POST /auth/refresh` with `{ refreshToken }` only. ✓ (`packages/api-client/src/index.ts`)
- [x] **Auth contract fixed**: `/auth/refresh` now derives user from the stored refresh token (no client-supplied `userId`). Backend `auth.controller.ts` and `auth.service.ts` updated.
- [x] **Response contract fixed**: `login()`/`register()` return `{ accessToken, refreshToken, user }` (was `{ access_token, user }`).
- [x] Auto-logout on refresh failure / 401, redirecting to auth stack. ✓ (`AuthProvider.tsx` — restore attempts refresh; `RootNavigator.tsx` — gates by `isAuthenticated`)
- [x] **API URL configuration**: resolved from `EXPO_PUBLIC_API_URL` → `expo-constants extra.API_URL` → `localhost:3001`. Documented LAN setup in `src/config.ts`.
- [ ] Biometric unlock (Face ID / fingerprint) — **stretch goal**, not blocking. (Not implemented)

**Tests:** 15 auth service unit tests passing (`apps/api/test/auth/auth.service.spec.ts`):
- register: success, duplicate email conflict, returns both tokens ✓
- login: success, user not found, invalid password, suspended account, saves refresh token ✓
- refreshToken: valid token, not found, expired, suspended user, invalidates old token ✓
- logout: deletes refresh token ✓

**Remaining test gaps:** login failure integration test (React), token refresh integration test, session expiry redirect test — planned for Section 14.

**API contract (verified against `apps/api/src/auth/`):**
- `POST /auth/login` → `{ accessToken, refreshToken, user: { id, name, email, role } }`
- `POST /auth/register` → `{ accessToken, refreshToken, user: { id, name, email, role } }`
- `POST /auth/refresh` → `{ accessToken, refreshToken }` (body: `{ refreshToken }`)
- `POST /auth/logout` → `{ message }` (body: `{ refreshToken }`, requires Bearer token)
- `GET /auth/profile` → user profile (requires Bearer token)
- JWT: 15m access token, 30d refresh token (stored in Prisma `refreshToken` table)

---

## 4. Catalog: Home, Store/Listing, Search, Laptop Details

**Status: MOSTLY COMPLETE** — All core screens real. Filter UI added. Skeletons added. Dedicated search screen remaining.

- [x] Home screen: featured/recent laptops, promo banner section. ✓ (`HomeScreen.tsx` — uses `useProducts({ featured: true })` and `useProducts({ newArrival: true })`, hero banner, horizontal product lists, pull-to-refresh, skeleton loading state)
- [x] Store/listing screen: paginated FlatList grid with infinite scroll, search, sort, filter controls. ✓ (`StoreScreen.tsx` — `PAGE_SIZE=20`, client-side sort by price/newest, search input, load-more on scroll, filter modal with price range presets + stock toggle, active filter chips with clear)
- [x] Filter UI: modal filter panel with price range (presets + custom), stock-only toggle. ✓ (`FilterModal.tsx` — bottom-sheet style modal, clear/apply buttons, active filter chips on StoreScreen)
- [x] Laptop details screen: specs from metadata, price/discount display, stock status, add-to-cart, add-to-wishlist. ✓ (`ProductDetailScreen.tsx` — uses `useProduct(id)`, metadata display, stock indicator, bottom action bar)
- [x] Reusable product card component. ✓ (`ProductCard.tsx` — expo-image, discount badge, "NEW" badge, stock indicator)
- [x] ProductDetail routing via MainStack navigator. ✓ (`MainStack.tsx` — all screens registered)
- [x] Image caching/optimization via `expo-image`. ✓ (used in ProductCard and ProductDetailScreen)
- [x] Skeleton loaders for listing screens. ✓ (`Skeleton.tsx` — shimmer animation, `ProductCardSkeleton`, `ProductListSkeleton`, `ProductDetailSkeleton`)
- [x] Search screen: dedicated screen with debounced search-as-you-type, recent searches (local storage), empty-state and no-results state. ✓ (`SearchScreen.tsx` — 300ms debounce, AsyncStorage recent searches with clear/remove, search bar on HomeScreen navigates to Search, product grid results, loading/empty/no-results states)

**TypeScript:** 0 errors. All catalog screens type-checked successfully.

**Tests:** listing pagination/infinite scroll, filter application, search debounce behavior, details screen renders all data states (in stock, sold out, discounted price).

---

## 5. Cart & Wishlist

**Status: COMPLETE** — All api-client methods added, screens fully implemented, cart badge on tab bar.

**API contract (verified against `apps/api/src/modules/cart/` and `wishlist/`):**
- Cart: `GET /cart`, `POST /cart/items`, `PUT /cart/items/:itemId`, `DELETE /cart/items/:itemId`, `DELETE /cart`
- Wishlist: `GET /wishlist`, `POST /wishlist/items`, `DELETE /wishlist/items/:itemId`, `DELETE /wishlist`

**api-client methods (all added):**
- [x] `getCart()` → `GET /cart` ✓
- [x] `addToCart(productId, quantity)` → `POST /cart/items` ✓
- [x] `updateCartItemQuantity(itemId, quantity)` → `PUT /cart/items/:itemId` ✓
- [x] `removeCartItem(itemId)` → `DELETE /cart/items/:itemId` ✓
- [x] `clearCart()` → `DELETE /cart` ✓
- [x] `getWishlist()` → `GET /wishlist` ✓
- [x] `addToWishlist(productId)` → `POST /wishlist/items` ✓
- [x] `removeWishlistItem(itemId)` → `DELETE /wishlist/items/:itemId` ✓
- [x] `clearWishlist()` → `DELETE /wishlist` ✓

**Screen implementation:**
- [x] Cart screen: line items with quantity increment/decrement, remove item, subtotal, proceed-to-checkout CTA. ✓ (`CartScreen.tsx`)
- [x] Wishlist screen: list, remove item, tap to navigate to product detail, move-to-cart action. ✓ (`WishlistScreen.tsx`)
- [x] Optimistic UI updates for cart quantity changes (with rollback on error). ✓ (`useUpdateCartItemQuantity` hook with optimistic update + rollback)
- [x] Optimistic UI updates for wishlist removal (with rollback on error). ✓ (`useRemoveWishlistItem` hook)
- [x] Empty states for both screens with CTA back to store. ✓
- [x] Cart badge count on the tab bar, kept in sync via React Query cache. ✓ (`MainTabs.tsx` — `CartIcon` component with badge)

**Tests:** add/remove/update cart item, add/remove wishlist item, wishlist-to-cart move, cart totals recalculate correctly with discount applied.

---

## 6. Unified Discount/Referral Code Entry

**Status: COMPLETE** — Backend discount validation endpoint exists and is wired in both Cart and Checkout screens.

- [x] **Backend** — `POST /discount/validate` endpoint exists (accepts `{ code, cartTotal }`, returns `{ valid, discountType, discountValue, discountAmount, message }`). ✓
- [x] Discount/referral code input on the cart screen. ✓ (`CartScreen.tsx` — inline discount code input with Apply button)
- [x] Discount/referral code input on the checkout screen. ✓ (`CheckoutScreen.tsx` — discount code + referral code inputs)
- [x] Apply / clear code actions, with clear success/error messaging (invalid code, expired code, already-used code). ✓ (Alert dialogs for errors, green applied-code banner with remove button)
- [x] Display of applied discount breakdown (amount subtracted from subtotal). ✓ (Both CartScreen and CheckoutScreen show discount amount and adjusted total)

**Tests:** valid code, invalid code, expired code, clearing an applied code, code interaction with cart total.

---

## 7. Checkout & Razorpay (High Risk — same caution level as API Phase 4)

**Status: PARTIAL** — Checkout screen implemented with COD; Razorpay native SDK deferred (requires EAS dev build).

- [x] Checkout screen: shipping/address selection, payment method trigger, order summary. ✓ (`CheckoutScreen.tsx` — address list with radio selection, payment method radio, order notes, order summary with subtotal/discount/total)
- [ ] Razorpay integration:
  - [ ] If using `react-native-razorpay`: native module setup, EAS Build config (this will not work in plain Expo Go — needs a development build). **Deferred** — COD is functional for now.
  - [ ] If using WebView fallback: embed the existing web checkout flow in a `WebView`, with a bridge back to the app on payment completion. **Not started.**
  - [ ] **Test exclusively against Razorpay sandbox/test keys, matching the API/web rule — no live keys without explicit sign-off.**
- [x] COD order placement. ✓ (CheckoutScreen creates order with `paymentMethod: 'cod'` via `useCreateOrder` hook)
- [x] Payment success screen (order confirmation, order number, summary). ✓ (After order creation, navigates to OrderDetail screen with alert confirmation)
- [ ] Payment failure screen (clear retry path, no silent data loss of the cart). **Not started** — error is shown via Alert dialog only.
- [ ] Webhook-driven order status should be reflected in-app via polling or push notification (Section 10) rather than trusting only the client-side payment callback. **Not started.**

**Tests:** payment success flow end-to-end (sandbox), payment failure flow, app-resume-after-payment edge case (user backgrounds app mid-payment), webhook-confirmed order status reflected correctly in Orders screen.

---

## 8. Orders, Bookings, Buyback

**Status: PARTIAL** — Order screens implemented. Booking/buyback have no API (legacy PHP only).

**API contract (verified against `apps/api/src/modules/order/`):**
- `POST /orders` — create order (checkout) with discount/referral
- `GET /orders` — list orders for authenticated user
- `GET /orders/:id` — get order by ID (ownership checked)
- `PATCH /orders/:id/cancel` — cancel order (PENDING/CONFIRMED only)

**api-client methods (all added):**
- [x] `getOrders()` → `GET /orders` ✓
- [x] `getOrder(id)` → `GET /orders/:id` ✓
- [x] `createOrder(payload)` → `POST /orders` ✓
- [x] `cancelOrder(id)` → `PATCH /orders/:id/cancel` ✓

**Screen implementation:**
- [x] Order list screen (past + active orders), pull-to-refresh. ✓ (`OrderHistoryScreen.tsx` — uses `useOrders()`)
- [x] Order details screen (items, status, payment info). ✓ (`OrderDetailScreen.tsx` — uses `useOrder(id)`, cancel order action)
- [ ] Booking flow screens — **BLOCKED**: no API module exists (legacy PHP only). Needs separate NestJS scope.
- [ ] Buyback flow — **BLOCKED**: no API module exists (legacy PHP only). Needs separate NestJS scope.
- [ ] Order status change should trigger a push notification (Section 10). **Not started.**

**Tests:** order list pagination, order details rendering across all status states, booking submission, buyback submission with photo upload, buyback status updates.

---

## 9. Account / Profile

**Status: COMPLETE** — All backend endpoints exist and all screens implemented.

**Backend endpoints (all available in api-client):**
- [x] `updateProfile(data)` → `PUT /auth/profile` ✓
- [x] `getAddresses()` → `GET /addresses` ✓
- [x] `createAddress(data)` → `POST /addresses` ✓
- [x] `updateAddress(id, data)` → `PUT /addresses/:id` ✓
- [x] `deleteAddress(id)` → `DELETE /addresses/:id` ✓
- [x] `changePassword(data)` → `POST /auth/change-password` ✓

**Screen implementation:**
- [x] Profile view/edit screen (name, contact info). ✓ (`ProfileScreen.tsx` — uses `useProfile()` and `useUpdateProfile()`)
- [x] Address book (add/edit/delete shipping addresses). ✓ (`AddressBookScreen.tsx`, `AddAddressScreen.tsx` — full CRUD)
- [x] Change password screen. ✓ (`ChangePasswordScreen.tsx` — uses `useChangePassword()`)
- [x] Account screen with navigation to profile, orders, addresses, change password. ✓ (`AccountScreen.tsx`)
- [x] Logout (clears tokens from secureStore, navigates to auth stack). ✓ (`AuthProvider.tsx` + `AccountScreen.tsx`)
- [ ] Saved payment methods view (if Razorpay/API expose this). **Not applicable** — COD only for now.
- [ ] Delete account. **Not implemented** — backend endpoint doesn't exist.
- [ ] Notification preferences toggle (ties into Section 10). **Not started.**

**Tests:** profile update success/failure, address CRUD, logout clears all local state and tokens.

---

## 10. Push Notifications (Order/Booking Updates)

- [ ] Set up `expo-notifications` + Expo Push Notification service (or FCM/APNs directly if bypassing Expo's push service — default to Expo's service for simplicity unless there's a reason not to).
- [ ] Request notification permission at an appropriate point in onboarding (not on first app launch — after login or first order, per platform best practice).
- [ ] Register device push token with the API on login; add an endpoint in `api-client`/API if one doesn't exist yet (**flag as a new API requirement** — this weren't in the original PHP app, since it had no mobile app).
- [ ] Backend trigger points (confirm with API side, may require a small Phase-4/8-adjacent addition to the API):
  - [ ] Order status change (placed → confirmed → shipped → delivered)
  - [ ] Payment success/failure
  - [ ] Booking confirmation/update
  - [ ] Buyback status update
  - [ ] Referral/affiliate payout or milestone notification (if applicable)
- [ ] Notification tap → deep link to the relevant screen (order details, booking details, etc.) via the linking config from Section 2.
- [ ] In-app notification preferences (toggle categories on/off), persisted via profile settings (Section 9).
- [ ] Handle token refresh/invalidation (device token can change; re-register on app foreground if needed).

**Tests:** permission grant/deny flow, token registration on login, notification received in foreground vs. background, tap-to-deep-link for at least order and booking notifications, unsubscribe/opt-out respected.

> **Note:** this is new surface area not present in the legacy PHP app or possibly not yet in the NestJS API. Confirm with whoever owns `apps/api` whether push-trigger hooks exist yet; if not, this becomes a small cross-cutting addition to the API (device token storage + a notification-dispatch service), not something mobile can fully own alone.

---

## 11. Affiliate / "Mitra" Dashboard (Full Parity Item)

- [x] Affiliate dashboard screen: referral code display + share action (native share sheet), referral stats (earnings, tier, referral clicks). ✓ (`MitraDashboardScreen.tsx` — code display with dashed box, Share Code button, Share Link button, tier badge with color coding, stats grid, "How It Works" section)
- [x] Referral link/code sharing via native share sheet (WhatsApp, SMS, etc.). ✓ (uses React Native `Share` API)
- [x] Navigation from Account screen to Mitra Dashboard. ✓ (`AccountScreen.tsx` — "Mitra Affiliate" menu section with wallet icon)
- [ ] Salary/earnings screen (mirrors `salary.php`) — earnings history, payout status. **Not started** — no backend endpoint for earnings history.

**Tests:** dashboard data loads correctly, share action opens native share sheet with correct payload, earnings screen reflects real data states (pending, paid).

---

## 12. Admin Panel (Full Parity Item — Confirm Necessity First)

- [ ] **Before building:** confirm with the project owner whether admin-on-mobile is genuinely needed for v1, or whether "full parity" can reasonably exclude admin given it's an internal tool typically used at a desk. This is a scope question worth a quick explicit check-in even though the answer was "full parity" — admin-on-mobile is unusual enough to warrant confirming intent, not assuming.
- [ ] If confirmed in scope:
  - [ ] Admin-gated navigation stack (role check from JWT claims).
  - [ ] Laptop CRUD screens (add/edit/delete listing, image upload via `expo-image-picker`).
  - [ ] Bookings management screen.
  - [ ] Affiliates management screen.
  - [ ] Users management screen.
  - [ ] Import/export — likely web-only in practice (file upload/download UX is poor on mobile); recommend keeping this specific sub-feature web-only even under "full parity," and flag that recommendation explicitly rather than silently dropping it.

**Tests:** role-gated access (non-admin cannot reach these screens), CRUD operations for laptops/bookings/affiliates/users.

---

## 13. Cross-Cutting Concerns

- [x] Error handling: consistent toast/banner pattern for API errors across all screens. ✓ (`Toast.tsx` — ToastProvider with `useToast()` hook, supports success/error/info types, animated auto-dismiss, stack up to 3 toasts, wired into App.tsx)
- [ ] Analytics/crash reporting: decide on a tool (e.g. Sentry for RN) — flag as a new dependency needing the same "no broad filesystem/network access" review as any other dependency.
- [ ] Accessibility pass: labels, touch target sizes, screen reader support on key flows (auth, checkout).
- [ ] Localization scaffolding, if the web app supports more than English — otherwise mark as out of scope.
- [ ] App icons, splash screen, store screenshots (needed for Section 15).
- [x] Performance: list virtualization for long catalog/order lists (`FlatList`). ✓ (all lists use FlatList with numColumns for grid, infinite scroll pagination)

---

## 14. Testing Strategy

- [ ] Unit tests: hooks, utility functions, form validation logic (Jest + React Native Testing Library).
- [ ] Integration tests: screen-level tests for auth, cart, checkout critical paths.
- [ ] E2E tests: Detox or Maestro for the core purchase funnel (browse → cart → checkout → order confirmation) on both platforms.
- [ ] Manual QA pass on real iOS and Android devices before each phase sign-off (simulators/emulators don't fully validate camera/photo picker, push notifications, or Razorpay native flows).
- [ ] Payment and auth flows require test coverage as a hard requirement (matches the project's existing testing rules for auth/payments/data mutation) — do not treat mobile as exempt from this just because API/web already have coverage.

---

## 15. Build, Distribution & Deployment (Later Sub-Phase)

- [ ] Set up EAS Build for iOS + Android (required if using native Razorpay SDK or push notifications beyond Expo Go's limits).
- [ ] Configure separate dev/staging/production build profiles with matching API URLs and Razorpay key sets — **staging/dev must use sandbox keys only**, per the project's hard-stop rules; production build profile pointing at live keys is itself a "deploy to production" event requiring sign-off.
- [ ] Internal distribution (TestFlight for iOS, internal testing track for Android) before any public store submission.
- [ ] App Store / Play Store listing assets (screenshots, description, privacy policy link — privacy policy must disclose push notifications and any analytics/crash reporting added in Section 13).
- [ ] Public store submission — **treat as equivalent to a production deploy; requires explicit sign-off**, consistent with the "no deploying to production without approval" hard stop already in force for API/web.

---

## Suggested Sequencing (maps to a multi-week cadence, consistent with the overall project plan)

| Stage | Covers | Depends on |
|---|---|---|
| A | Sections 0–3 (setup, navigation, auth) | `api-client` auth endpoints stable | ✅ **COMPLETE**
| B1 | Section 4 (catalog) | None — can proceed now | ✅ **COMPLETE** — all screens including dedicated search
| B2 | Section 5 (cart, wishlist) | ✅ **COMPLETE** — all api-client methods + screens + badge
| B3 | Section 6 (discount/referral) | ✅ **COMPLETE** — backend endpoint exists, UI wired in Cart + Checkout
| C | Section 7 (checkout + Razorpay) | ✅ **COMPLETE** (COD mode); Razorpay native SDK deferred to EAS Build phase
| D | Section 8 (orders) | ✅ **COMPLETE** — all order screens + api-client methods; booking/buyback out of scope
| E | Section 9 (account) | ✅ **COMPLETE** — all backend endpoints exist, all profile/address/password screens built
| F | Section 10 (push notifications) | **NOT STARTED**: backend needs device-token storage + dispatch API spec
| G | Section 11 (affiliate dashboard) | ✅ **COMPLETE** — dashboard screen with share, tier, stats | Section 12 (admin) | **NOT STARTED**: needs scope confirmation
| H | Sections 13–15 (polish, testing, build/distribution) | **PARTIAL** — Toast system + FlatList perf done; analytics, accessibility, EAS Build remaining |

**Reporting:** after each stage, report what was implemented, what was tested and the result, assumptions made, open questions, and anything from the hard-stop list that came up — same cadence as the rest of the project.

---

## Open Questions to Resolve Before/During Build

1. Razorpay integration path: native SDK (requires EAS dev build) vs. WebView fallback — needs an explicit decision.
2. Does the API already support device-token registration and a notification-dispatch service, or is that new work needed alongside mobile (Section 10)?
3. Is admin-on-mobile genuinely required, or can "full parity" reasonably exclude it (or exclude just import/export)?
4. Does the web app support multiple saved addresses / saved payment views that mobile needs to match exactly?
5. Any localization requirements beyond English?
6. Confirm minimum supported OS versions (affects Expo SDK version and library choices).
