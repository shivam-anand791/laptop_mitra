---
name: mobile-phase7-planning
description: Decisions and gaps for Phase 7 mobile app implementation
metadata:
  type: project
---

Mobile Phase7 is active. Decisions and outstanding gaps below.

## Razorpay
- **Decision**: Native SDK (`react-native-razorpay`), NOT WebView.
- API exposes `POST /payments/razorpay/order` → mobile calls that and hands order ID to native SDK.
- **Consequence**: Section1 must set up `expo-dev-client` + EAS Build (not bolted on later in Section7).

## Push Notifications (Section10)
- **Blocked** on new backend work.
- Mobile must stop at Section10 and hand back a spec: device-token storage shape + dispatch trigger points.
- No stubbing/mocking to keep moving.

## Booking/Buyback (Section8 2nd half)
- Bigger gap: no API module exists (legacy PHP only).
- Needs its own mini-scope on `apps/api` (schema + endpoints).
- Mobile: proceed with Orders (Section8 1st half — `getOrders`/`createOrder` exist, just need `getOrder(id)` wrapper) → skip to Section9.

## api-client gaps (needed just-in-time before their sections)
- **Cart** (before Section5): `updateCartQuantity` (PUT), `clearCart` (DELETE) — web `lib/api.ts` already has these; need packaging in `packages/api-client`.
- **Orders** (before Section8): `getOrder(id)` wrapper — API endpoint exists, client wrapper missing.
- **Account** (before Section9): profile update / address / password-change wrappers — DTOs exist server-side, need client exposure.

## Pre-existing web app gaps (flag back, not mobile scope)
- **Discount validation**: web `validateDiscount` uses mock data, no real endpoint. Flagging to confirm before Section6.
- **Affiliate dashboard**: API has Referral entity but web dashboard uses mock data. Same pattern — flagging before Section11.

## Auth (Section3)
- No OTP or forgot-password endpoints in api-client.
- Confirm with API side whether OTP is intentionally gone or just not exposed; forgot-password real gap or deferred scope.

## Platform targets
- iOS 13+ / Android 8 (API26) → Expo SDK52. Approved.

## Admin (Section12)
- Deferral confirmed. Will confirm necessity before Section12.

## Sequence
- Proceeding with Section1 (Project Setup), with EAS Build / expo-dev-client included per Razorpay native SDK decision.