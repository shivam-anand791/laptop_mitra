# Mobile Execution Prompt — LaptopMitra React Native App (Phase 7)

Copy everything below into your coding agent as the task brief for the mobile phase. Attach `LaptopMitra_Mobile_Implementation_Plan.md` alongside this prompt — that file is the source of truth for scope; this prompt controls *how* to work through it.

---

## Context

`apps/api` (NestJS) and `apps/web` (Next.js) are complete and stable. `packages/types` and `packages/api-client` exist and reflect the real API contracts. You are now building `apps/mobile` (React Native / Expo) inside the existing Turborepo monorepo, to full feature parity with the web app, including push notifications for order/booking updates.

The attached file `LaptopMitra_Mobile_Implementation_Plan.md` is the complete scope document: 15 numbered sections plus a 7-stage sequencing table (A–G) at the bottom. Do not treat it as something to implement end-to-end in one pass — see "How to work through this" below.

## Required rules (unchanged from the main project, priority order)

1. Security rules
2. Ask-before-doing hard stops (below)
3. Testing rules for auth, payments, and data mutation
4. Code quality rules
5. Git rules
6. Deployment rules

If a rule file isn't available in-session, ask rather than inventing an assumption.

## Ask before doing this (hard stops — mobile-specific additions marked [MOBILE])

- Using **live** Razorpay keys anywhere in dev/test/staging — sandbox/test keys only.
- Deploying/publishing to a production environment.
- **[MOBILE]** Submitting a build to the App Store or Play Store, even to an internal/beta track beyond TestFlight/internal-testing — treat this as equivalent to a production deploy.
- **[MOBILE]** Adding a native module or dependency that requires an EAS custom dev build (i.e. anything that won't run in plain Expo Go) — flag and confirm before adding, since it changes the whole team's dev workflow.
- Changing existing auth/permission logic in ways that could lock out real users.
- Sending real push notifications or emails to real user devices/addresses during dev/testing — use test devices/tokens only.
- Installing a dependency with broad filesystem/network/system access.
- Force-push or history rewrite on a shared branch.
- **[MOBILE]** Calling or assuming the existence of any backend endpoint not already present in `packages/api-client` (e.g. push-token registration, notification dispatch) — if a section needs an endpoint that doesn't exist yet, stop and flag it as a required API addition rather than mocking it or guessing its shape.
- **[MOBILE]** Building the Admin Panel (Plan Section 12) before its "confirm necessity" check-in has actually happened with me.

## How to work through this (chunking rules — read carefully)

The plan is intentionally broken into small sections to avoid hallucinated code against endpoints, screens, or libraries that don't actually exist yet. Follow these rules without exception:

1. **Analyze the corresponding web implementation before building each section — not just once at the start.** Before writing any mobile code for a given plan section, read the actual `apps/web` code for that feature area first: the pages/components involved, the exact `api-client` calls they make, the request/response shapes from `packages/types` they rely on, form field names and validation rules, empty/error/loading states, and any business logic embedded in the component (not just the API). Mobile screens should be built from what the web app *actually does*, not from a fresh interpretation of the plan's bullet points — the plan describes scope, the web code is the spec for behavior. If the web implementation of a feature diverges from what the plan describes, flag the discrepancy and default to matching the web app's real behavior unless told otherwise. This applies per-section, since later sections may touch web code that didn't exist or wasn't reviewed yet at the start of the project.
2. **One section at a time.** Work strictly in the order of the plan's Stage A→G sequencing table, and within a stage, in section-number order. Do not start section N+1 until section N has been implemented, tested per its own "Tests:" list, and reported back on (see Reporting below).
3. **Re-state the section before building it.** At the start of each section, restate in your own words: what you're about to build, which checklist items from that section you're addressing, what you found reviewing the equivalent web code (rule 1), and which `api-client` methods / `packages/types` types you'll use. If a needed method/type doesn't exist, stop here — don't fabricate it.
4. **No look-ahead implementation.** Don't pre-build scaffolding for a later section "while you're in there" (e.g. don't wire up push notification hooks while building the cart screen in Section 5). Cross-cutting concerns (Section 13) get applied incrementally per-screen when you reach the screen that needs them, not all at once up front.
5. **Small diffs, reviewable commits.** Each section should land as its own commit (or small set of commits), not batched with other sections. Commit messages should reference the plan section number (e.g. `mobile: section 4 - catalog listing + search`).
6. **Flag ambiguity instead of resolving it silently.** If a section's requirements are underspecified (e.g. exact fields on the address form, exact copy for an empty state) and the web app doesn't resolve it either, pick the most reasonable option, implement it, and call it out explicitly in the report — don't spend time guessing at pixel-perfect parity without checking.
7. **Stop at every open question in the plan.** The plan's "Open Questions to Resolve Before/During Build" list (bottom of the doc) must be resolved with me before the section that depends on it starts — notably: Razorpay integration path (before Section 7), device-token/notification-dispatch API support (before Section 10), and the admin necessity check-in (before Section 12).
8. **Sandbox-only, always.** Every Razorpay call, every push notification test, every "real" data touchpoint uses test/sandbox credentials and test devices throughout — this doesn't relax as sections progress.

## Reporting back (after every section, not just every stage)

- What web code was reviewed for this section, and any behavior/field/state discrepancies found between the plan doc and the actual web implementation.
- What was implemented (map to the plan's checklist items — confirm which are done, which are deferred and why).
- What was tested, and the result (map to that section's "Tests:" list).
- Assumptions made (anything you picked without an explicit spec).
- Open questions surfaced.
- Anything from the hard-stop list that came up.
- Confirmation of the next section you intend to start, so I can redirect before you begin if needed.

## Suggested first message back to me

Before writing any code, respond with:
1. Confirmation you've read `LaptopMitra_Mobile_Implementation_Plan.md` in full.
2. A gap-check against `packages/api-client`: for each of the 15 plan sections, note whether the endpoints it needs already exist, are missing, or you're unsure.
3. A brief map of where the relevant web code lives for each plan section (e.g. "Section 4 (catalog) → apps/web/app/store, apps/web/app/laptop/[id]"), so it's clear you know what you'll be reviewing before each section starts.
4. Your answers/questions on the 6 "Open Questions" at the bottom of the plan — flag which ones block Stage A vs. later stages, so we're not blocked on questions that don't matter yet.
5. Your proposed first section to start (should be Section 0, Pre-Build Checklist).

---

**Start with Section 0 (Pre-Build Checklist) only. Do not proceed to Section 1 until Section 0's items are confirmed complete and I've acknowledged your report.**
