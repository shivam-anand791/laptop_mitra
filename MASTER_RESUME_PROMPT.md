# Master Resume Prompt — LaptopMitra Mobile App Implementation

> **Use this prompt to resume work on the LaptopMitra React Native (Expo) mobile app from wherever it was paused.** This prompt contains all context, decisions, and next steps needed for an agent to pick up seamlessly.

---

## 🎯 Project Overview

**Goal:** Build a full-feature-parity React Native (Expo) mobile app for LaptopMitra, matching the Next.js web app (`apps/web`) and NestJS API (`apps/api`). Covers customer flows, affiliate/Mitra dashboard, admin panel, and push notifications.

**Monorepo:** Turborepo + pnpm workspace
- `apps/api` — NestJS API (**complete, stable**, verified in VERIFICATION_REPORT.md)
- `apps/web` — Next.js web app (**complete, stable**, verified in VERIFICATION_REPORT.md)
- `apps/mobile` — **Expo React Native app (IN PROGRESS — Sections 0-2 done, Section 3 real implementation complete, Sections 4-6 next)**
- `packages/types` — Shared TypeScript types (shared)
- `packages/api-client` — Generated API client (shared)
- `packages/config` — Shared ESLint/TS config

**Current Branch:** `master` (working directory: `C:\vloume d\laptopmitra`)

---

## ✅ What's Already Done (Sections 0–3 Complete)

| Section | Status | Key Files |
|---------|--------|-----------|
| **0. Pre-Build Checklist** | ✅ Complete | All checks satisfied |
| **1. Project Setup** | ✅ Complete | `apps/mobile/` scaffolded, Metro configured, providers wired |
| **2. Navigation & App Shell** | ✅ Complete | `RootNavigator.tsx`, `MainTabs.tsx`, `AuthStack.tsx`, `LinkingConfig.ts`, `QueryProvider.tsx` |
| **3. Authentication** | ✅ Complete | **All auth screens implemented and type-checked** |

### Verified Working
- `pnpm dev --filter mobile` runs blank Expo app on iOS/Android/Expo Go
- Navigation shell: Auth stack ↔ Main tabs gated by JWT in `expo-secure-store`
- React Query + `api-client` wired via `QueryProvider` + `useApi.ts`
- **All 5 auth screens fully functional**: Login, Register, Forgot Password, Reset Password, OTP (placeholder)
- React Hook Form + Zod validation wired
- Secure token storage in `expo-secure-store` — tokens persist across restart
- `AuthProvider.refreshAccessToken()` calls API `/auth/refresh` and auto-logout on failure
- Deep linking (`laptopmitra://`) configured for push notification taps
- `@react-native-community/netinfo` installed for offline banner

### Key Files — Auth Screens (all built, type-checked, lint-pass)
```
apps/mobile/src/screens/auth/
├── LoginScreen.tsx           # Email + password → login → auto-gate to MainTabs
├── RegisterScreen.tsx        # Name, email, password, optional phone (+91) → register → auto-login
├── ForgotPasswordScreen.tsx  # Email → sends reset email → shows success message
├── ResetPasswordScreen.tsx   # Token + new password → resets password → redirects to login
└── OTPVerificationScreen.tsx # Placeholder: "Not implemented yet — API uses email/password only"
```

### API Client Updates (in `packages/api-client/src/index.ts`)
- `forgotPassword(email)` → `Promise<{ message: string }>` → `/auth/forgot-password`
- `resetPassword(token, newPassword)` → `Promise<{ message: string }>` → `/auth/reset-password`
- `refreshAccessToken(refreshToken)` → `Promise<{ accessToken, refreshToken }>` → `/auth/refresh`

### AuthProvider (in `apps/mobile/src/providers/AuthProvider.tsx`)
- `login(accessToken, refreshToken, user)` — stores tokens in SecureStore
- `logout()` — clears SecureStore, sets state to null
- `refreshAccessToken()` — fetches new tokens from API; on 401/fallback → `logout()` → redirect to Auth stack
- `restoreSession()` — loads tokens from SecureStore on app start; auto-gates navigation

### Navigation (in `apps/mobile/src/navigation/`)
- `AuthStackParamList`: Login | Register | ForgotPassword | ResetPassword | OTPVerification
- `RootNavigator.tsx`: `user ? MainTabs : AuthStack` gate
- `MainTabParamList`: Home | Store | Wishlist | Cart | Account

### React Query Hooks (in `apps/mobile/src/hooks/useApi.ts`)
- `useLogin()` — mutation: `apiClient.login(email, password)`
- `useRegister()` — mutation: `apiClient.register(data)`
- `useForgotPassword()` — mutation: `apiClient.forgotPassword(email)`
- `useResetPassword()` — mutation: `apiClient.resetPassword(token, newPassword)`
- `useProfile()` — query: `apiClient.getProfile()`

---

## 📋 Next Stages (Priority Order)

### Stage B — Sections 4–6: Catalog, Cart, Wishlist, Discounts
| Section | Screens | Dependencies |
|---------|---------|--------------|
| 4. Catalog | Home, Store/Listing, Search, Laptop Details | Catalog endpoints stable |
| 5. Cart & Wishlist | Cart, Wishlist, optimistic updates | Cart/wishlist endpoints |
| 6. Discount/Referral | Unified code input on Cart/Checkout | Discount endpoint |

### Stage C — Section 7: Checkout + Razorpay ⚠️ HIGH RISK
**Decision needed before starting:**
- **Native SDK** (`react-native-razorpay`) → Requires EAS Dev Build (not Expo Go)
- **WebView fallback** → Embed web checkout, bridge back on completion
- **Test ONLY with sandbox keys** — hard stop: no live keys without sign-off

### Stage D — Sections 8–9: Orders, Bookings, Buyback, Account
### Stage E — Section 10: Push Notifications (needs API endpoint for device token)
### Stage F — Sections 11–12: Affiliate Dashboard, Admin (confirm admin scope first)
### Stage G — Sections 13–15: Polish, Testing, Build/Distribution

---

## ❓ Open Questions (Resolve Before Relevant Stage)

| # | Question | Blocking Stage | Status |
|---|----------|----------------|--------|
| 1 | Razorpay: Native SDK vs WebView? | C (Section 7) | ❌ Undecided |
| 2 | API: Device-token registration + notification dispatch exist? | E (Section 10) | ❌ Unknown |
| 3 | Admin-on-mobile genuinely needed? (or exclude import/export) | F (Section 12) | ❌ Unconfirmed |
| 4 | Web app: Multiple saved addresses / saved payment methods? | D (Section 9) | ❌ Unknown |
| 5 | Localization beyond English? | G (Section 13) | ❌ Unknown |
| 6 | Minimum OS versions (affects Expo SDK/lib choices) | A (Section 0) | ❌ Unknown |

**Action on resume:** Ask the user to clarify any open question blocking your next task.

---

## 🛡️ Hard Stops (Non-Negotiable)

1. **No live Razorpay keys** — sandbox/test keys only until explicit sign-off
2. **No production deploy without approval** — TestFlight/internal → store submission = production deploy
3. **No silent workarounds for missing API endpoints** — if `api-client` lacks an endpoint, surface it as a gap
4. **No web-only types in `packages/types`** — must be RN-compatible
5. **Auth/payment flows require test coverage** — mobile not exempt from project testing rules
6. **EAS Build required** if using native Razorpay or push beyond Expo Go limits

---

## 🚀 How to Resume — Step by Step

### 1. Verify Environment
```bash
cd C:\vloume d\laptopmitra
pnpm install                    # Ensure deps synced
pnpm dev --filter mobile        # Should start Expo dev server (verified working)
pnpm type-check --filter mobile # Passes ✅
pnpm lint --filter mobile       # Passes ✅ (with minor pre-existing warnings)
```

### 2. Confirm Current Git State
```bash
git status                      # Check for uncommitted changes
git log --oneline -5            # Recent commits
```

### 3. Start Building Section 4 — Catalog (Stage B)
**Begin with HomeScreen.tsx** — first screen of the catalog section:
- Use `useProducts()` query from `useApi.ts` to fetch products
- Display in FlatList with thumbnails (expo-image for caching)
- Add filter/sort controls (mirror web's store.php filters)
- Add skeleton loaders while data loads
- Test on iOS simulator + Android emulator

**Then StoreScreen.tsx**, **SearchScreen.tsx**, **LaptopDetailsScreen.tsx**

### 4. After Catalog — Stage B.5: Cart & Wishlist
- Build **CartScreen.tsx** with optimistic UI updates
- Build **WishlistScreen.tsx**
- Add cart badge count on tab bar (kept in sync via React Query cache)

### 5. Stage C: Checkout + Razorpay ⚠️
- Make the Razorpay decision (Native SDK vs WebView)
- If WebView: embed existing web checkout flow
- If Native: configure EAS Dev Build
- Build Checkout screen with discount/referral code input

### 6. After Each Screen
- Test on real iOS and Android devices (simulators/emulators don't fully validate camera/photo picker, push notifications, or Razorpay native flows)
- Verify token persistence across app restart
- Verify auto-logout on 401/refresh failure

---

## 📁 Key Commands Reference

| Task | Command |
|------|---------|
| Start mobile dev server | `pnpm dev --filter mobile` |
| Type-check mobile | `pnpm type-check --filter mobile` |
| Lint mobile | `pnpm lint --filter mobile` |
| Run all tests | `pnpm test` |
| Build API client | `pnpm build --filter @laptopmitra/api-client` |
| Check API client endpoints | `cat packages/api-client/src/index.ts` |

---

## 🎯 Success Criteria for Each Stage

### Section 3 (Auth) ✅ Completed
- [x] Login screen works → lands on Home tab
- [x] Login fails gracefully → shows error toast
- [x] Signup creates account → auto-logs in
- [x] Forgot password sends reset email
- [x] Reset password works with valid token → redirects to login
- [x] Token refresh works silently in background
- [x] 401 on any API call → auto-logout → redirect to Login
- [x] Tokens persist in `expo-secure-store` across app kill/restart

### Section 4–6 (Catalog, Cart, Wishlist, Discounts) — In Progress
- [ ] Product listing loads with pagination/infinite scroll
- [ ] Filter and sort controls work
- [ ] Add to cart works with optimistic UI
- [ ] Cart totals recalculate correctly
- [ ] Wishlist add/remove works
- [ ] Discount code applied at checkout

### Section 7 (Checkout + Razorpay) — Pending Decision
- [ ] Razorpay integration path decided (native vs WebView)
- [ ] Payment success screen works (sandbox)
- [ ] Payment failure screen works
- [ ] Webhook-driven order status reflected in-app

---

## 💡 Pro Tips for the Resuming Agent

1. **Read `apps/mobile/src/navigation/types.ts` first** — it defines every route and param
2. **Check `packages/api-client` before building any screen** — all auth endpoints now present
3. **Reuse `expo-image` for all images** — already installed, handles caching
4. **Keep `RootNavigator.tsx` auth logic** — it's the gatekeeper, don't bypass
5. **Deep links use `laptopmitra://`** — configure in `LinkingConfig.ts` and `app.config.ts`
6. **Test on real device for** — camera (buyback), push notifications, Razorpay native
7. **Use `FlatList` for long lists** — avoid ScrollView for catalogs with many items
8. **Keep validation schemas in sync with `packages/types`** — don't duplicate types
9. **React Query cache keeps forms in sync** — use `useQueryClient().invalidateQueries()` after mutations
10. **Stage G success**: All features tested, build passes on EAS, store submission ready

---

## 🔗 Related Files to Read on Resume

- `LaptopMitra_Mobile_Implementation_Plan.md` — This full plan (source of truth)
- `apps/mobile/app.config.ts` — Env, keys, push config
- `apps/mobile/src/providers/AuthProvider.tsx` — Token flow (refresh + auto-logout)
- `apps/mobile/src/api/client.ts` — React Query + api-client wrapper
- `apps/mobile/src/hooks/useApi.ts` — `useLogin`, `useRegister`, `useProfile`, `useForgotPassword`, `useResetPassword` hooks
- `packages/api-client/src/index.ts` — Auth endpoints (forgotPW, resetPW, refreshToken)
- `apps/mobile/src/navigation/types.ts` — All route params and navigators
- `apps/mobile/src/screens/auth/` — All 5 auth screens (built and type-checked)

---

**Start by running `pnpm dev --filter mobile` and confirming the app loads. Then begin Stage B: Section 4 — Catalog screens, starting with HomeScreen.tsx.**

---

*Generated from implementation plan at `LaptopMitra_Mobile_Implementation_Plan.md` and verified against actual codebase state (type-check ✅, lint ✅) — update this prompt if the plan changes.*