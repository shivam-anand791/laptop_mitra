# LaptopMitra: Master Test Plan, Test Cases and Agent Execution Prompt

Scope: customer web storefront, mobile app (Expo), admin and support and technician panels, API, payments, email, storage, environments. Written from a senior tester's view: risk first (money, security, identity, data integrity), then core journeys, then everything else. Many features are in different states of completion, so every case carries a feature status that the agent determines first: **[B]** built, **[P]** partial, **[F]** future (planned; run only when built, otherwise report NOT BUILT).

Contents: A. Strategy and rules, B. Agent prompt, C. Test data and environments, D. Decision tables and boundary tables, E. Test cases by module, F. Exploratory charters, G. Regression traps from this project's history, H. Smoke suite, I. Reporting formats.

---

## A. STRATEGY AND RULES

**Priorities.** P0 = money, security, authentication, order placement, data loss (blocks release). P1 = core journey broken or wrong data. P2 = secondary feature or workaround exists. P3 = cosmetic.
**Severity.** Blocker (cannot ship, data loss, security hole, wrong charge); High (feature broken, wrong money or status); Medium (wrong but workaround exists); Low (cosmetic).
**Test types.** A = automate (Playwright, API integration, unit); M = manual or exploratory; H = hybrid. Automate every P0 and P1.
**Techniques used.** Equivalence classes, boundary values, decision tables, state transitions, pairwise combinations (purchase mode x payment x coupon x user type), error guessing from past defects (section G), session-based exploratory testing (section F), risk-based ordering.
**Entry criteria.** API, web and mobile build; dev database from scratch with all migrations (`migrate status` clean, `migrate diff` empty); seeds loaded; mock mail capture and Razorpay test mode or stub working; `pnpm doctor` green.
**Exit criteria (release gate).** 100% of P0 and 95% of P1 executed and passing; zero open Blockers; zero open High in money, security or auth; all failed tests have bug entries; no console errors or hydration warnings on smoke pages; accessibility: zero critical or serious automated violations on key pages; security checklist (E.SEC) completed; environment parity checks (E.ENV) pass on the production-like build.

---

## B. AGENT EXECUTION PROMPT (paste this, then attach this file)

```
ROLE: You are the independent QA lead for LaptopMitra. Execute LAPTOPMITRA_MASTER_TEST_PLAN.md. You TEST AND REPORT; you do NOT fix product code in this task (independence). You may add test code, fixtures and seed scripts only.

SAFETY RULES
- No GSD or planning files. Do NOT edit .env files. No writes, migrations or tests against Supabase or any remote or production database; protected dev and test databases only (use the protected-host guard). No push. Mask secrets, emails and tokens in all output. Test users only on @example.test.
- Payments: Razorpay TEST mode or a stub behind the existing gateway interface only; never real money. Email: mock capture only; never real recipients. Public production endpoints: GET-only smoke probes, no writes.
- Never write PASS without evidence (screenshot, response body, DB SELECT, log line, test output). Type-check alone is not evidence. A test that cannot run is BLOCKED or NOT BUILT, with the reason, never skipped silently.

PHASE T0: SETUP AND FEATURE STATUS (report, then continue)
1. Build the environment per section C: clean dev database from migrations, deterministic seed (`pnpm db:dev:seed-test-scenarios`, guarded, idempotent), test accounts, mock mail capture, Razorpay test or stub, Firebase test setup (emulator for automated tests only; production refuses emulator tokens), a controllable clock for time-window tests (inject a clock service or use fake timers; propose if absent), Playwright for web (two and three browser contexts), an API test harness with real guards and a real test database, axe, Lighthouse, a k6 or autocannon load script, OWASP ZAP baseline against the local app.
2. For every test case in section E, set feature status B, P or F by reading the code and trying the UI. Output the status table.
3. Run `pnpm doctor` and /health/ready; record the baseline (suite counts, type-check, lint, build).
STOP only if the environment cannot be built.

PHASE T1: SMOKE (section H)
Run the smoke suite on web and API, and a mobile smoke checklist. If any smoke test fails, report immediately and continue with the independent modules.

PHASE T2: RISK-BASED EXECUTION (in this order)
SEC, AUTH, PAY and CHK, ORD, CPN, CRT, RET, DAT, REF, RNT, BYB, SUP, ADM, SVC, BIZ, PRO, PDP, CAT, GEN, NTF, MOB, then non-functional (PERF, A11Y, CMP, SEO, ENV, RES). For each module: automate P0 and P1, execute P2 and P3 manually or exploratively, record results per test ID.
- Use the decision and boundary tables in section D as data-driven test inputs. Do not hand-pick a few rows.
- Drive time-based rules through the controllable clock (return windows, buyback tiers, coupon expiry, SLA, auto-close, lease months, free service windows), always in IST.
- For every state-changing action verify FOUR things: the response, the database rows, the other-side view (customer versus admin versus support versus technician, web versus mobile) without a hard refresh, and the audit log or event trail.
- Every authorization check is done with three actors: the owner, another customer, and each staff role.

PHASE T3: EXPLORATORY SESSIONS (section F)
Run each charter for a fixed time box, take notes, log every anomaly, and convert findings into test cases.

PHASE T4: NON-FUNCTIONAL
Security (OWASP API and web checklist in E.SEC plus a ZAP baseline), performance (budgets in E.PERF), accessibility (axe plus keyboard-only runs), compatibility (matrix in E.CMP), SEO checks, environment parity and resilience (E.ENV, E.RES).

PHASE T5: AUTOMATION HANDOVER
Commit the automated suites under tests/ (e2e, api, security, perf, a11y) with README, scripts (`pnpm test:smoke`, `test:e2e`, `test:api`, `test:security`, `test:a11y`, `test:perf`), CI-ready configuration, deterministic seeds, and a flaky-test policy (no retries that hide failures; quarantine list with owners).

PHASE T6: REPORTING (formats in section I)
Produce test-reports/RESULTS.csv, TEST_REPORT.md (summary, coverage by module and priority, pass and fail counts, NOT BUILT and BLOCKED lists, top 10 risks, go or no-go against the exit criteria), BUG_LIST.md (every defect in the template), and RETEST_PLAN.md. Group related bugs, mark which are regressions of the history in section G, and propose a fix order (security and money first).
After I fix defects you will retest only affected cases plus the smoke suite and the P0 pack.

COMMUNICATION: post a short progress note after each module (counts of pass, fail, blocked, not built; new Blockers or Highs). Report any Blocker or security finding immediately.
```

---

## C. TEST DATA AND ENVIRONMENTS

**Environments.** (1) Local dev: web, API, mobile against the dev database. (2) Production-like local build: `next build` plus `next start`, API built (`dist`), production profile classification with dummy hosts (no connections to production). (3) Vercel preview and production and Render API: GET-only smoke probes, plus manual UI checks only with test accounts when I authorize.

**Accounts (all @example.test).** customer-new (no orders), customer-orders (every order state), customer-business (BusinessProfile, GSTIN), customer-lease, guest (anonymous), admin, support, technician, suspended-user, unverified-email-user, user-with-pending-withdrawal.
**Products.** in stock; out of stock; low stock (1 unit); rent priced (1, 3, 6, 12 and 24 month tenures as configured); rent enabled but unpriced; with variants (one variant out of stock); different warranty months; bulk prices set and unset; archived; draft; very long name; no images; special characters; price with paise (for example 49,999.99).
**Orders.** pending COD; confirmed prepaid; shipped with courier and tracking; delivered inside return window; delivered on the last day; delivered the next day; out of return window but inside warranty; out of warranty; cancelled; refunded; return in progress; multi-item (buy plus rent); quantity 3; with coupon; with referral; with warranty add-on; with 16GB option.
**Coupons.** percent with cap; flat; min order value; first order only; per-user limit 1; total limit 2; targeted; paused; scheduled (future); expired; exhausted; payment-method restricted; excluding a category; combinable with referral; warranty-inclusive and exclusive.
**Other data.** tickets in each status with attachments and unread replies; returns in each status; buyback requests per status; lease contracts with paid, due and overdue installments; withdrawal requests; referral earnings pending, matured, reversed; help articles (published, draft); saved replies; service jobs (if built).
**Clock fixtures.** delivered on 31 Aug (six months later clamps to 28 or 29 Feb), on 29 Feb of a leap year, at 23:59:59 IST and 00:00:00 IST boundaries, and around 31 Mar to 1 Apr (financial year).

---

## D. DECISION TABLES AND BOUNDARY TABLES (use as data-driven inputs)

**D1. Return window (outright, delivered 12 Oct 2026 10:00 IST; window closes end of day 19 Oct IST)**
| Request time (IST) | Expected |
|---|---|
| 12 Oct 10:00 | eligible |
| 19 Oct 23:59:59 | eligible |
| 20 Oct 00:00:00 | not eligible, plain reason with the date, warranty claim offered |
| order.notes edited on 25 Oct, request on 21 Oct | still not eligible (window uses the delivery date, never updatedAt) |
| lease item, day 1 | not eligible for self-serve return, routed to a ticket |
| item with an active return or buyback | not eligible, reason shown |
| item cancelled or refunded | not eligible |

**D2. Buyback tiers (age counted from delivery date; boundaries upper-inclusive; payout = net item price paid x tier minus convenience charge, never below 0)**
| Age | Tier |
|---|---|
| 0 days to exactly 6 months | 70% |
| just over 6 to exactly 12 months | 60% |
| just over 12 to exactly 18 months | 50% |
| just over 18 to exactly 24 months | 40% |
| just over 24 to exactly 30 months | 30% |
| just over 30 to exactly 36 months | 20% |
| just over 36 months | not eligible, no request possible |
Also: delivered 31 Aug and requested at the "6 months" clamp date; net price with coupon and referral share; warranty add-on excluded from the basis; convenience charge 0 (line hidden) versus above 0 (separate line); lease item not eligible; quantity 2 line (per unit); a second request after rejection or cancellation allowed; after PAID never again; the tier table in the database, the types package, the buyback page, the terms page and the mobile page all agree.

**D3. Coupon validation (every row: preview and order creation both enforce it)**
| Case | Expected |
|---|---|
| now = startsAt minus 1 s / at startsAt / at endsAt / endsAt plus 1 s (IST) | not started / valid / valid (inclusive, document it) / expired |
| status paused, archived, scheduled, exhausted | specific plain reason each |
| cart = min value minus 0.01 / equal / above | blocked with "add Rs X more" / valid / valid |
| percent with cap, discount below and above the cap | capped exactly |
| flat amount larger than eligible base | discount limited to the base, total never negative |
| first-order-only: new user / user with a cancelled order only / user with a delivered order | valid / valid (cancelled does not count) / blocked |
| per-user limit 1: second use, after cancellation, after payment failure | blocked / restored and valid / restored and valid |
| total limit 2: two concurrent redemptions of the last unit | exactly one succeeds |
| payment method restricted to online: COD selected | blocked with reason, switch to online offered |
| rent line in cart with a sell-only coupon | discount on sell lines only, rent line untouched |
| category and product include and exclude lists, mixed carts | discount applies to eligible lines only |
| warranty add-on in base: excluded and included settings | base differs accordingly |
| referral code plus coupon: combinable flag off and on | blocked / both applied per rule |
| targeted coupon: assigned user, other user, guest | valid / generic invalid / sign-in prompt |
| unknown code, lowercase, spaces, 5,000 chars, SQL and script payloads | generic message, normalized to uppercase, rate-limited, no leak |
| cart changes after apply (remove an item, quantity change) | recalculated, invalid coupon removed with a message |
| cancel before dispatch, cancel after delivery, return after delivery | restored / not restored / follows policy and refund share is proportional |
| discount allocation across 3 lines with odd paise | shares sum exactly to the discount, refunds sum exactly |

**D4. COD eligibility (server and UI both enforce it)**
| codMode | Pincode | Environment | Expected |
|---|---|---|---|
| OFF | any | production profile | COD hidden or disabled with reason; online payment path works |
| NCR_ONLY | in allowlist prefix | production profile | allowed |
| NCR_ONLY | outside | production profile | rejected server-side with reason CHECKOUT_COD_UNAVAILABLE |
| ALL | any | any | allowed |
| any | any | dev or test profile | allowed for testing |
| COD with a lease item | per PHP and owner rule | any | enforce the documented rule |
Also: pincode with 5, 6 and 7 digits, letters, leading zeros, whitespace; client-forced COD in a crafted request is rejected.

**D5. Order status transitions (state machine; invalid transitions return 409)**
PENDING to CONFIRMED to SHIPPING to DELIVERED; PENDING or CONFIRMED to CANCELLED; DELIVERED to return states only through the return flow; SHIPPING requires courier name and tracking number (and a serial number per unit when serial tracking is enabled, ADMIN override with a reason). Test every allowed and every disallowed pair, by every role.

**D6. Money and rounding**
Price with paise; 18% GST inclusive calculation; discount rounding; shipping zero; warranty add-on 1,999; 16GB deltas (+4,000 buy, +500 per month rent); quantity 1, 3 and the maximum; totals equal on PDP, cart, checkout, Razorpay amount (paise), order, invoice, admin, emails and refunds; sum of line shares equals the order total to the paisa; refund amount equals the paid share; partial refunds never exceed the paid amount.

**D7. Role x resource (authorization matrix; test each cell for allow and deny)**
Roles: guest, customer (owner), customer (other), support, technician, admin. Resources: orders, order items, returns, tickets and attachments, internal notes, addresses, payout details, withdrawals, buyback, lease contracts and installments, service jobs, invoices, coupons (read and write), products (read and write), users and roles, settings, audit logs, email log, CSV export, client notes, business profile, bank detail decrypt, help CMS.

---

## E. TEST CASES BY MODULE

Format: ID | Test (steps) | Expected result | Priority | Type. Statuses are determined in Phase T0.

### E.GEN Global, navigation, layout
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| GEN-01 | Load home logged out and in | 200, no console errors, no hydration warnings, brand blue and white theme intact | P0 | A |
| GEN-02 | Header: logo, search, account, wishlist and cart badges, phone link, Get a Quote | each works; badges match data; tel link uses the configured number | P1 | A |
| GEN-03 | Navbar dropdowns by mouse, keyboard, touch | open, close on Esc and outside click; every link returns 200 | P1 | A |
| GEN-04 | "Warranty & Support" and footer help links | open /help inside the full layout, not WhatsApp | P1 | A |
| GEN-05 | Footer links (help, track order, returns, warranty, buyback, terms, privacy, contact) | all resolve, no 404 | P1 | A |
| GEN-06 | Crawl all internal links to depth 3 | zero 404 or 500, no redirect loops | P1 | A |
| GEN-07 | Unknown route and server error | friendly 404 and error pages with navigation, no stack trace | P1 | A |
| GEN-08 | Responsive at 320, 360, 390, 768, 1024, 1440, 1920 px | no horizontal scroll, no overlap, tap targets at least 44 px | P1 | H |
| GEN-09 | Floating WhatsApp and call buttons | correct configured number, wa.me opens with encoded text, do not cover primary buttons on mobile | P2 | M |
| GEN-10 | Browser back and forward after login and logout | no stale private data shown | P1 | A |
| GEN-11 | Refresh on every deep route | page renders (no blank, no 404) | P1 | A |
| GEN-12 | API down | visible error state with Retry; NO silent mock data; dev banner shows when a fallback is used | P0 | A |
| GEN-13 | Number and date formats | Indian digit grouping, "5 Nov 2026" IST everywhere | P2 | A |
| GEN-14 | Breadcrumbs and Back links on deep pages | correct parents | P2 | A |
| GEN-15 | Production build shows no dev indicators or dev banners | none | P2 | A |
| GEN-16 | Naming consistency (Mitra Affiliate Program, Rent / Lease, plain-language labels) | consistent across web, mobile, emails | P3 | M |
| GEN-17 | Cookie, storage and third-party script inventory | nothing unexpected, no tokens in localStorage | P1 | A |

### E.AUTH Authentication, sessions, roles
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| AUTH-01 | Sign up valid | account created, DB user synced with role CUSTOMER, referral code generated | P0 | A |
| AUTH-02 | Sign up invalid inputs (bad email, weak password, mismatch, empty, spaces, 300 chars, unicode) | field-level plain messages, no account | P1 | A |
| AUTH-03 | Duplicate email signup | clear message, one DB user | P0 | A |
| AUTH-04 | Login valid | redirect to next or account, header updates | P0 | A |
| AUTH-05 | Login wrong password and unknown email | same generic message, no account-existence leak | P0 | A |
| AUTH-06 | Repeated failures | rate-limit message, recovers later | P1 | A |
| AUTH-07 | ?next= handling: /account/orders, /admin, https://evil.com, //evil.com, /\evil.com, javascript:alert(1), encoded variants, very long | internal paths only; everything else ignored | P0 | A |
| AUTH-08 | Role-aware landing after login | ADMIN to /admin, SUPPORT to support pages, TECHNICIAN to service jobs, CUSTOMER to account | P1 | A |
| AUTH-09 | Customer opens /admin and each admin route | clear 403 page, no redirect loop, no data fetched | P0 | A |
| AUTH-10 | Logged-out opens /account/*, /checkout, /admin | redirected to login with next, returns after login | P0 | A |
| AUTH-11 | Logout (and from a second tab) | session cleared, private pages inaccessible, Back does not reveal data | P1 | A |
| AUTH-12 | Persistence after refresh, restart, token expiry (clock) | stays signed in or refreshes cleanly | P1 | A |
| AUTH-13 | Database down after Firebase success | "account setup incomplete" banner, Retry works without the password, Cancel signs out, no half-signed-in state, no retry storm | P0 | A |
| AUTH-14 | Guest checkout identity | GUEST role created, blocked from tickets, payouts, withdrawals, buyback, account-only pages | P0 | A |
| AUTH-15 | Guest then login or signup | cart preserved and merged, no duplicate users | P1 | A |
| AUTH-16 | Forgot password: existing and unknown email | identical responses and timing class, email only for existing, rate-limited | P0 | A |
| AUTH-17 | Reset link: valid, expired, reused, tampered | correct states; old sessions revoked after reset; confirmation email | P0 | A |
| AUTH-18 | Email verification link and resend | arrives, verifies without re-login, resend cooldown shown, expired link recovers, wrong-account message | P0 | A |
| AUTH-19 | Verification not blocking shopping or checkout unless the setting says so; admin and support exempt | as specified | P1 | A |
| AUTH-20 | OTP flows [F] | valid, wrong, expired (10 min), attempts limit, resend cooldown, reuse, brute-force throttle; OTP never in logs | P0 | A |
| AUTH-21 | Change password | needs current password; weak rejected; other sessions revoked | P1 | A |
| AUTH-22 | Sign out of all devices [F] | other sessions invalid within the defined time | P1 | A |
| AUTH-23 | Token abuse: expired, wrong project, malformed, none | 401 with specific code, no data | P0 | A |
| AUTH-24 | Same email with a different Firebase UID | no duplicate, no account takeover | P0 | A |
| AUTH-25 | Suspended user | cannot sign in or act; clear message | P1 | A |
| AUTH-26 | Role changes by admin (promote, demote, self-demotion) | audited; self-demotion blocked; takes effect on the next request | P0 | A |
| AUTH-27 | Multi-tab and multi-device consistency | no conflicting states | P2 | M |
| AUTH-28 | Missing Google sign-in | no dead button | P2 | M |
| AUTH-29 | Firebase unavailable or misconfigured | specific message, not "database" or "password" error | P1 | A |
| AUTH-30 | Mobile login, secure storage persistence, app restart, background and foreground token refresh | works | P1 | H |

### E.CAT Catalog, search, filters
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| CAT-01 | Products list loads, count equals API total, images lazy | correct | P0 | A |
| CAT-02 | Each filter alone and combined (brand, processor, RAM, storage, category, price, grade, stock, procurement model) | correct results, counts live from inventory, reset works | P1 | A |
| CAT-03 | Facet counts against SQL for 10 combinations | exact | P1 | A |
| CAT-04 | Sort (price low and high, newest, featured) | correct, stable on ties | P1 | A |
| CAT-05 | Search: model, brand, processor, partial, typo, uppercase, symbols, 1 char, 200 chars, SQL and script payloads | sensible results, no errors, payloads inert, empty state | P0 | A |
| CAT-06 | Predictive search [F] | debounced, keyboard navigation, thumbnails, Esc closes | P2 | A |
| CAT-07 | URL state for filters, sort, search; back and forward | restored and shareable | P1 | A |
| CAT-08 | Pagination boundaries and out-of-range page | no crash, last page correct | P1 | A |
| CAT-09 | Empty results and API failure | reset CTA; error with Retry; never mock data | P0 | A |
| CAT-10 | Archived and draft products | never visible in list, search or by direct URL | P0 | A |
| CAT-11 | Price chips: MRP strike, discount percent, rent "from" or "Price on request" | correct and consistent with PDP | P0 | A |
| CAT-12 | Product card actions (open, wishlist, quick add if present) | work for guest and customer | P1 | A |
| CAT-13 | Slug, UUID and legacy ID URLs; invalid | resolve or 404 | P1 | A |
| CAT-14 | Price range extremes (min above max, negative, huge) | validated | P2 | A |
| CAT-15 | 100 plus products render and scroll performance | within budget | P2 | A |

### E.PDP Product detail
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| PDP-01 | Gallery, zoom, keyboard, missing image placeholder | works | P1 | H |
| PDP-02 | Specs match database; plain labels | correct | P1 | A |
| PDP-03 | Buy and Rent toggle | prices change; rent tenures from admin; unpriced rent shows "Price on request" with a quote CTA and add to cart disabled | P0 | A |
| PDP-04 | 16GB upgrade | +4,000 buy, +500 per month rent; cart line shows the option; total correct | P0 | A |
| PDP-05 | Warranty add-on | price and months from settings; buy only; hidden for rent; text matches the setting everywhere | P0 | A |
| PDP-06 | Pincode check: valid, unserviceable, 5 and 7 digits, letters | correct estimate, same function as cart and checkout | P1 | A |
| PDP-07 | Add to cart (guest, customer), double-click, stock limits | one line, quantity capped, no duplicates | P0 | A |
| PDP-08 | Buy now | goes to checkout with only this item | P1 | A |
| PDP-09 | Wishlist toggle persistence | persists and syncs | P1 | A |
| PDP-10 | Share and Earn | logged in: link and code in the encoded message; guest: plain share | P1 | A |
| PDP-11 | Bulk price and quote CTA | prices from database; modal prefilled; no bulk price in cart | P1 | A |
| PDP-12 | Buyback strip and link | six tiers from the database; link works | P1 | A |
| PDP-13 | Free service strip [F] | text from settings | P2 | A |
| PDP-14 | Variants | price, stock, SKU, images change; out-of-stock variant disabled | P0 | A |
| PDP-15 | Out-of-stock product | add disabled, no checkout path | P0 | A |
| PDP-16 | Price parity across card, PDP, cart, checkout, order, invoice, admin | identical | P0 | A |
| PDP-17 | Tabs (specs, inspection, box, warranty, FAQ) vs PHP and terms | consistent; no hardcoded "1-Year" | P1 | M |
| PDP-18 | Admin changes price | storefront and mobile reflect within the defined refresh window; carts show "price changed" | P0 | A |
| PDP-19 | Non-existent product | 404 with navigation | P1 | A |
| PDP-20 | Mobile sticky bar and layout | no overlap | P1 | M |

### E.CRT Cart
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| CRT-01 | Add, update quantity, remove, clear | totals update; server state matches | P0 | A |
| CRT-02 | Same product as buy and rent, different configurations | separate lines, no key collision | P0 | A |
| CRT-03 | Warranty toggle per line | +1,999 each; blocked for rent server-side | P0 | A |
| CRT-04 | Quantity edge cases (0, negative, decimal, huge, above stock) | validated server-side | P0 | A |
| CRT-05 | Guest cart persistence and merge at login | merged once, no duplicates, prices re-validated | P0 | A |
| CRT-06 | Price changed since add | notice and updated price; no silent charge | P0 | A |
| CRT-07 | Product archived or out of stock after add | line flagged, cannot checkout | P0 | A |
| CRT-08 | Totals: subtotal, discount, delivery, GST inclusive, grand total; rent month-1 note | match D6 | P0 | A |
| CRT-09 | Cart across devices (web and mobile) | same server cart | P1 | A |
| CRT-10 | Coupon box and offers panel | per D3 | P0 | A |
| CRT-11 | Pincode serviceability in cart | consistent with PDP | P1 | A |
| CRT-12 | Tampered requests (price, mode, warranty price in body) | ignored; server recomputes | P0 | A |
| CRT-13 | Rapid clicks, two tabs | consistent final state | P1 | A |
| CRT-14 | Empty cart and recommendations | clear CTA | P2 | A |

### E.CPN Coupons and promo codes (customer and admin)
Run every row of D3 through the API preview, the order API and the UI. Plus:
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| CPN-01 | Admin creates each coupon type with live preview | customer sees the same wording | P0 | A |
| CPN-02 | Admin edits a coupon with redemptions | warning; past orders keep snapshots; future orders use new values | P0 | A |
| CPN-03 | Pause, resume, duplicate, archive (no delete) | statuses and visibility correct; audit entries | P1 | A |
| CPN-04 | Bulk-generate unique codes and CSV export | unique, non-ambiguous characters, ADMIN only | P1 | A |
| CPN-05 | SUPPORT on coupon routes | read-only; every write rejected | P0 | A |
| CPN-06 | Redemption race: last unit, 10 parallel orders | exactly one succeeds, counters exact | P0 | A |
| CPN-07 | Restoration on cancel, payment failure, expired reservation | counters and per-user usage restored once | P0 | A |
| CPN-08 | Expiry job and read-time status agree | no stale status | P1 | A |
| CPN-09 | Offers panel: eligible and not-yet-eligible with reasons, expiry countdown | accurate | P1 | A |
| CPN-10 | My Coupons page | available, used, expired correct | P2 | A |
| CPN-11 | Brute-force code guessing | rate limit and logging; generic errors | P0 | A |
| CPN-12 | Fake client-side coupons (FIRST500, MITRA*) | no longer grant discounts anywhere | P0 | A |
| CPN-13 | Coupon on invoice, order detail, refund screens | discount lines match allocation | P1 | A |
| CPN-14 | Analytics: usage, discount given | match database | P2 | A |

### E.CHK Checkout and orders placement
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| CHK-01 | Place COD order (dev) as customer and guest | order created, stock reserved, confirmation page, email attempted, appears in My Orders and admin | P0 | A |
| CHK-02 | Address validation (pincode 6 digits, phone formats, required fields, long and unicode text) | field-level messages | P1 | A |
| CHK-03 | Saved address selection, new address, default | correct snapshot on the order | P1 | A |
| CHK-04 | COD rules per D4 | enforced in UI and server; online path offered | P0 | A |
| CHK-05 | Pay online success (test mode) | signature verified, order CONFIRMED, payment recorded, confirmation shown | P0 | A |
| CHK-06 | Pay online cancelled, failed, closed modal, browser closed after paying | no half order; reservation released; recovery by webhook; order visible on return | P0 | A |
| CHK-07 | Double submit, idempotency key reuse, refresh on success page | exactly one order, one charge | P0 | A |
| CHK-08 | Price tampering, client-sent totals, wrong mode, negative quantity, other user's address id | rejected or ignored | P0 | A |
| CHK-09 | Stock race: last unit, two buyers | one succeeds, other gets a specific message | P0 | A |
| CHK-10 | Price changed between cart and pay | review step; no silent difference | P0 | A |
| CHK-11 | Rent line: month-1 charge, labels, price missing rejected | per policy | P0 | A |
| CHK-12 | Mixed cart buy plus rent | totals and invoice lines per policy | P0 | A |
| CHK-13 | Coupon and referral applied at order creation | re-validated server-side | P0 | A |
| CHK-14 | Email verification gate when enabled and disabled | specific message; no raw errors | P1 | A |
| CHK-15 | Reason-coded errors (COD unavailable, out of stock, price changed, coupon invalid, payment failed) | plain text, alternative shown | P1 | A |
| CHK-16 | Estimated delivery on confirmation | from the shared function | P1 | A |
| CHK-17 | Order number format and uniqueness under concurrency | unique, sequential | P1 | A |
| CHK-18 | Checkout on mobile (keyboard, native payment flow, back button) | works | P0 | H |
| CHK-19 | Transaction atomicity (failure injection mid-order) | no partial rows, stock and coupon restored | P0 | A |
| CHK-20 | Large order (quantity 10, 20 lines) | within limits, correct totals | P2 | A |

### E.PAY Payments and webhooks
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| PAY-01 | Webhook signature valid and invalid | invalid rejected with no side effects | P0 | A |
| PAY-02 | Webhook replay and out-of-order (captured after failed, order.paid duplicates) | idempotent, final state correct | P0 | A |
| PAY-03 | Amount mismatch between order and payment | flagged, not confirmed | P0 | A |
| PAY-04 | Refund full and partial (prepaid) | gateway call, status REFUND_PENDING then REFUNDED, amounts exact | P0 | A |
| PAY-05 | Refund idempotency and double click | one refund | P0 | A |
| PAY-06 | COD cash collected marking | who and when audited; "Paid on delivery" text only after it | P1 | A |
| PAY-07 | Payment history page links to orders | correct | P2 | A |
| PAY-08 | Gateway down or slow | clear message, retry, no stuck reservation | P1 | A |
| PAY-09 | Test and live key separation | live keys never used in dev or test | P0 | A |
| PAY-10 | Card data never stored or logged | verified in DB and logs | P0 | A |

### E.ORD Orders and account order views
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| ORD-01 | Orders list: search by number or product, filters, counts, pagination | server counts for the whole set, correct filters | P0 | A |
| ORD-02 | Order card: image, specs, number format, one status chip, payment text, estimated delivery | per design; no raw IDs | P1 | A |
| ORD-03 | Status chip and payment text mapping for all combinations | plain-language table respected | P1 | A |
| ORD-04 | Order detail: tracker with real steps only, courier link, address, price breakdown, invoice rules | correct for every state | P0 | A |
| ORD-05 | Cancel (before dispatch), whole order and item-level [P/F] | reasons, stock released, refund path, coupon and referral handling, disabled after dispatch with reason | P0 | A |
| ORD-06 | Address or phone change request before dispatch | request created, staff approve or reject, applied only if still before dispatch, customer notified | P1 | A |
| ORD-07 | Invoice availability (prepaid after payment, COD after delivery and cash, never lease until decided) | correct and immutable once issued | P0 | A |
| ORD-08 | Reorder and Buy again | cart rebuilt with current prices and stock | P1 | A |
| ORD-09 | Need help entry on card and detail | opens the situation menu for that item | P1 | A |
| ORD-10 | Admin changes (confirm, ship, deliver) | customer sees updates on focus or poll without hard refresh | P0 | A |
| ORD-11 | Order of another user by id | 403 or 404, no data | P0 | A |
| ORD-12 | Multi-item order with items in different situations | per-item menus differ correctly | P1 | A |
| ORD-13 | Time zones and date display for orders near midnight IST | correct date | P2 | A |

### E.RET Returns and refunds
Run all of D1. Plus:
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| RET-01 | Return reasons: defective, wrong item, damaged, missing accessory, photos mandatory | validation, evidence stored privately | P0 | A |
| RET-02 | Item selection in multi-item and quantity above 1 | per item, no double return of the same unit | P0 | A |
| RET-03 | Refund method: source, bank, UPI; COD bank details entered twice, IFSC validation, editable until processed | encrypted at rest, masked in UI and API | P0 | A |
| RET-04 | Admin queue: approve, reject with notes, pickup, inspection, pass and fail, refund (ADMIN only), UTR entry | state machine; invalid transitions 409; SUPPORT approval limit | P0 | A |
| RET-05 | Customer timeline and notifications | match staff actions | P1 | A |
| RET-06 | Restock on inspection pass; none on fail | stock exact | P0 | A |
| RET-07 | Refund amount with coupon share, warranty add-on, shipping | equals paid share | P0 | A |
| RET-08 | Referral earnings on return | held, reversed or released per rule; CHECK never violated | P0 | A |
| RET-09 | Double refund and concurrent approvals | one succeeds | P0 | A |
| RET-10 | Decrypt bank details | ADMIN only, audited, no-store header, never in lists | P0 | A |
| RET-11 | Return of lease item | blocked with a ticket route | P0 | A |
| RET-12 | Return after warranty and buyback interactions | blocked or routed per rules | P1 | A |
| RET-13 | Attachment abuse (wrong type, 50 MB, 6 images, renamed exe, SVG script) | rejected | P0 | A |

### E.RNT Rent and lease
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| RNT-01 | Rent price from admin per tenure; unpriced shows "Price on request" | server rejects unpriced lease in cart and order | P0 | A |
| RNT-02 | Tenure selection at checkout (if built) | stored on the order item | P0 | A |
| RNT-03 | Month-1 charge and labels on cart, checkout, order, invoice | consistent | P0 | A |
| RNT-04 | Contract creation on delivery; start and end dates; month-end clamping (31 Jan plus 1 month) | correct | P0 | A |
| RNT-05 | Installment schedule: due dates from the start date, amounts, statuses upcoming, due, overdue, paid, waived | correct; overdue derived | P0 | A |
| RNT-06 | Autopay setup, success, failure, cancel [P/F] | status accurate; fallback payment link or manual works; no silent failure | P0 | A |
| RNT-07 | Admin: mark paid with reference, waive, extension, termination, pickup, buyout quote (manual) | audited, customer sees changes | P1 | A |
| RNT-08 | Extension request and approval | new installments at the existing rate unless overridden | P1 | A |
| RNT-09 | Termination request and pickup | status flow and notifications | P1 | A |
| RNT-10 | My Rentals page | contract, installments, autopay status, pay now | P1 | A |
| RNT-11 | Rent item cancellation before dispatch | contract and subscription cancelled; refund of month 1 | P1 | A |
| RNT-12 | Multi-quantity rent line | one contract per unit | P1 | A |
| RNT-13 | Rent help actions (fault, billing, autopay help, damage) | structured tickets with context | P1 | A |
| RNT-14 | Reminders before due date | sent once | P2 | A |
| RNT-15 | Lease returns via self-serve | blocked | P0 | A |

### E.BYB Buyback
Run all of D2. Plus:
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| BYB-01 | Eligibility and estimate: outright delivered units only | correct; lease, returned, refunded, active return or active buyback not eligible | P0 | A |
| BYB-02 | Request: condition checklist, photos, payout details | validated; encrypted payout; masked display | P0 | A |
| BYB-03 | Quote: 15-day validity, admin delay flag, admin revision issues a new quote | per decisions | P0 | A |
| BYB-04 | Pickup charge setting 0 and above 0 | line hidden or shown; snapshot per request | P1 | A |
| BYB-05 | Inspection rules (boots, motherboard, display, charger, battery at least 70) | pass and fail paths | P0 | A |
| BYB-06 | Revised offer: accepted, declined (free return shipment tracking) | statuses correct | P0 | A |
| BYB-07 | Payout: ADMIN decrypt audited, UTR shown to customer | correct | P0 | A |
| BYB-08 | One active request per unit; second request after rejection allowed; after PAID impossible | enforced under concurrency | P0 | A |
| BYB-09 | Tier table editing in admin | gap-free, overlap-free, versioned, audited; snapshots on requests unchanged | P1 | A |
| BYB-10 | After PAID the item has no further actions | menu updated | P1 | A |
| BYB-11 | Static pages vs database tiers | identical six tiers everywhere | P0 | A |
| BYB-12 | Notifications for each status | sent once | P2 | A |

### E.SVC Free service, warranty, serial tracking [F unless built]
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| SVC-01 | Serial required before SHIPPING; ADMIN override with reason | enforced and audited | P0 | A |
| SVC-02 | Serial uniqueness among active units; edits audited; duplicate rejected | correct | P0 | A |
| SVC-03 | Entitlement on delivery: one outright service, 6 months, booking date decides, completion consumes | per D rules | P0 | A |
| SVC-04 | Window boundaries (day 183 versus 184, IST end of day), second booking blocked, cancel restores, no-show handling | correct | P0 | A |
| SVC-05 | Booking: serviceable pincode, slots, address, acknowledgement text from settings | correct | P1 | A |
| SVC-06 | Job state machine, technician assignment, checklist (cleaning, thermal paste, software, battery), parts, photos | valid transitions only | P1 | A |
| SVC-07 | TECHNICIAN role: sees only assigned jobs; no payments, coupons, bank details; rejected on other admin routes | enforced | P0 | A |
| SVC-08 | Receipt PDF and web view; immutable; sequential number | correct content | P1 | A |
| SVC-09 | Returned, refunded, buyback unit loses entitlement; active return blocks booking | correct | P1 | A |
| SVC-10 | Rent: one service per lease month, no carry-over | correct | P1 | A |
| SVC-11 | Reminders (window ending, warranty ending) | sent once | P2 | A |
| SVC-12 | Warranty register, unit history, brand views, search by serial | accurate | P1 | A |

### E.SUP Help center, guided help, tickets, support operations
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| SUP-01 | /help inside the full layout, search, categories, articles, helpful votes, public access | works; draft articles invisible | P1 | A |
| SUP-02 | Help-for-this-item panel in every situation (before dispatch, shipped, delivered in window, past window in warranty, out of warranty, cancelled, return in progress, refunded, rent states, buyback states, business overlay) | correct actions, plain disabled reasons, grouped sections | P0 | A |
| SUP-03 | Every enabled action works end to end and creates the right record and shows a reference number | no dead buttons | P0 | A |
| SUP-04 | Action registry guard | an action without a handler is hidden | P1 | A |
| SUP-05 | Create ticket with order and item, attachments (5 images, 1 video), warning notice | created, priority and SLA set | P0 | A |
| SUP-06 | Ticket thread, internal notes never visible to the customer | enforced in API and UI | P0 | A |
| SUP-07 | Guest cannot create tickets | blocked | P0 | A |
| SUP-08 | SLA: first response due, breach flag, idempotent job | correct | P1 | A |
| SUP-09 | Auto-close 7 days after resolved; reopen within 7 days; after window blocked | correct at boundaries | P1 | A |
| SUP-10 | CSAT rating after resolve | stored, once | P2 | A |
| SUP-11 | Unread dot and count sync web and mobile; internal notes excluded | correct | P1 | A |
| SUP-12 | Assignment, merge, saved replies, status and priority changes | audited events | P1 | A |
| SUP-13 | Queue ordering: urgent over high over medium over low across multiple pages; business priority within the same level | correct | P1 | A |
| SUP-14 | Callback request | phone validated, slot, creates CALLBACK ticket | P1 | A |
| SUP-15 | Change request (address, phone) approve, reject, apply | idempotent; only before dispatch | P1 | A |
| SUP-16 | Attachment access: owner, staff, other customer, expired signed URL | scoped and expiring | P0 | A |
| SUP-17 | XSS and HTML injection in ticket text, article markdown, names | rendered inert | P0 | A |
| SUP-18 | Support role limits (no refunds, no bank decrypt, approval limit) | enforced | P0 | A |
| SUP-19 | Ticket numbers unique under concurrency | unique | P1 | A |
| SUP-20 | Customer 360 and client notes append-only | no edits or deletes | P1 | A |

### E.REF Mitra Affiliate Program and payouts
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| REF-01 | Referral code generated once, unique format | correct | P1 | A |
| REF-02 | ?ref link capture for guests and logged-in; stored through signup | applied once | P1 | A |
| REF-03 | Self-referral blocked; invalid and expired code messages | plain reasons | P0 | A |
| REF-04 | Referral discount (Rs 500) at order creation, server-side | correct; combination rule with coupons | P0 | A |
| REF-05 | Earnings per unit (Rs 500 times units) credited as pending; mature at delivery plus return window; reversed on refund | ledger rows exact | P0 | A |
| REF-06 | Payout details: save, edit, masked display, encrypted at rest, ciphertext never in responses | verified in DB and network | P0 | A |
| REF-07 | Withdrawal: minimum amount, one pending at a time, balance check, insufficient balance, missing details | specific messages | P0 | A |
| REF-08 | Concurrent withdrawals (5 parallel) and concurrent admin approvals | exactly one succeeds; others conflict | P0 | A |
| REF-09 | Admin approve and reject with notes; balances move reserved to withdrawn or back | exact | P0 | A |
| REF-10 | Payout-detail change email to the user | sent | P2 | A |
| REF-11 | Admin decrypt payout details | audited, no-store, ADMIN only | P0 | A |
| REF-12 | GUEST and SUPPORT blocked from customer payout endpoints | 403 | P0 | A |
| REF-13 | Dashboard stats match ledger | exact | P1 | A |
| REF-14 | QR upload: types, size, magic bytes, replacement deletes old, private access | enforced | P0 | A |

### E.BIZ Corporate and business
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| BIZ-01 | Quote modal from every entry point (navbar, hero, bulk, PDP) | validation, honeypot, throttle, reference ID | P1 | A |
| BIZ-02 | Inquiry admin list, status flow, audit | correct | P1 | A |
| BIZ-03 | Sales alert email recipient from config | sent to the configured address | P2 | A |
| BIZ-04 | BusinessProfile set by ADMIN only; GSTIN format and check digit | invalid rejected | P1 | A |
| BIZ-05 | Priority flag affects queue order only within the same priority | correct | P1 | A |
| BIZ-06 | Manual order creation for a quote | appears in the customer's account | P1 | A |
| BIZ-07 | GST invoice correction ticket and business actions | visible only for business accounts | P2 | A |

### E.PRO Profile, addresses, wishlist, security settings, notifications
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| PRO-01 | Profile edit (name, phone, DOB), validation, email locked note | saved, reflected in admin | P1 | A |
| PRO-02 | Address add, edit, delete (confirm), default, pincode validation | correct, orders keep snapshots | P1 | A |
| PRO-03 | Wishlist add, remove, move to cart, out-of-stock state, guest to login merge | correct | P1 | A |
| PRO-04 | Notification preferences (email, push; no SMS toggle) | respected by senders | P2 | A |
| PRO-05 | Account menu and /profile redirect into /account | no dead ends, ?next works | P1 | A |
| PRO-06 | Avatar upload (if present) | type and size limits | P2 | A |
| PRO-07 | Data export or deletion requests (if present) | defined behavior, no hard delete of records | P2 | M |

### E.STA Static and legal pages
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| STA-01 | About, Privacy, Terms, Buyback on web and mobile | content equals the PHP source; no invented claims | P1 | M |
| STA-02 | Warranty months text everywhere from one setting | consistent | P0 | A |
| STA-03 | Return window text from settings matches behavior | consistent | P1 | A |
| STA-04 | Links between pages, anchors, print layout | work | P3 | M |

### E.ADM Admin, support and technician panels
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| ADM-01 | Role matrix D7 across every admin route and API endpoint (enumerated automatically) | allow and deny exactly as designed; SUPPORT and TECHNICIAN rejected where not permitted | P0 | A |
| ADM-02 | Nav shows only permitted items; no dead links; 403 state for others | correct | P1 | A |
| ADM-03 | Dashboard and analytics numbers vs SQL (orders, revenue, users, low stock, pending) | exact | P1 | A |
| ADM-04 | Product create and edit: price, MRP, rent per tenure, bulk, stock, warranty months, status, images, validation, unsaved-changes warning | saved, audited, price history | P0 | A |
| ADM-05 | Inline price and stock edit with validation, optimistic update and rollback | correct | P0 | A |
| ADM-06 | Variants: create, edit, price, stock, SKU uniqueness, activate, archive | correct | P0 | A |
| ADM-07 | Bulk price change with preview, confirmation and per-product audit | exact | P1 | A |
| ADM-08 | CSV export and import: dry run, row errors, all-or-nothing, round trip, CSV injection (=, +, -, @ cells) | no loss, formulas neutralized | P0 | A |
| ADM-09 | Archive instead of delete; warnings for referenced products | enforced | P1 | A |
| ADM-10 | Search, filters, sorting, pagination on every list | correct | P1 | A |
| ADM-11 | Orders: status transitions per D5, courier and tracking required, estimated date, cash collected, invoice, cancel, manual order | valid transitions only; customer-visible effects | P0 | A |
| ADM-12 | Users: view, role assignment, suspend and reactivate, self-demotion block | audited | P0 | A |
| ADM-13 | Coupons admin (see CPN) | as specified | P0 | A |
| ADM-14 | Inquiries, change requests, tickets, returns, buyback, leases, withdrawals queues | filters, statuses, audit | P1 | A |
| ADM-15 | Settings (COD mode and prefixes, warranty default, return window, SLA, delivery estimate, support hours, buyback settings, rental approval) | saved, validated, effective immediately, audited | P0 | A |
| ADM-16 | Audit log completeness and immutability | every sensitive action logged, no update or delete possible | P0 | A |
| ADM-17 | Email log and test-send (ADMIN) | accurate, no tokens or bodies stored | P2 | A |
| ADM-18 | Help CMS: categories, article editor, preview, publish and unpublish | public view updates | P1 | A |
| ADM-19 | Admin pages empty, loading and error states | friendly, no raw errors | P1 | A |
| ADM-20 | Admin UI consistency (shared components, light theme, no gradients) | visual regression baselines | P2 | A |
| ADM-21 | Technician pages on a phone: my jobs, checklist, photos | usable, limited data | P1 | M |
| ADM-22 | Two admins editing the same record | conflict handled, no silent overwrite | P1 | A |

### E.NTF Notifications and email
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| NTF-01 | Each template renders (plain and HTML), correct links per environment, no localhost links in production profile | correct | P0 | A |
| NTF-02 | Triggers for order, shipping, delivery, cancel, return, refund, ticket reply, resolve, buyback, lease, service | one per event | P1 | A |
| NTF-03 | Dedupe and idempotent reminder jobs | no duplicates on rerun | P1 | A |
| NTF-04 | Preferences respected; transactional versus reminder categories | correct | P2 | A |
| NTF-05 | Mail provider failures (403 domain, timeout, missing config) | reason codes, retries, user told truthfully | P0 | A |
| NTF-06 | Production stdout fallback prints no links, OTPs or tokens | verified | P0 | A |
| NTF-07 | Push notifications and deep links open the right screen | works on devices | P1 | M |
| NTF-08 | Unsubscribe or preference link where applicable | works | P3 | M |
| NTF-09 | Email deliverability checklist (SPF, DKIM, DMARC, From domain not free-mail) | documented and verified with seed inboxes | P1 | M |

### E.MOB Mobile app specifics
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| MOB-01 | Install, first launch, upgrade over an older build | no data loss, sessions kept | P1 | M |
| MOB-02 | Navigation, Android back button, deep links, push deep links | correct parent screens, no dead ends | P1 | H |
| MOB-03 | Keyboard overlap, numeric keyboards, autofill, small phones (320 px), large fonts | usable | P1 | M |
| MOB-04 | Permission flows (camera, photos, notifications): granted, denied, denied forever | graceful, settings guidance | P1 | M |
| MOB-05 | Image and video upload: big files, rotation, slow network, cancel | limits enforced, progress, retry | P1 | M |
| MOB-06 | Offline, flaky network, API timeout, token refresh in background | clear states, no crashes, no duplicate submissions | P0 | H |
| MOB-07 | Native payment flow: success, cancel, back, app killed during payment | order state recovers | P0 | M |
| MOB-08 | Secure storage: tokens not in plain storage; logout clears | verified | P0 | M |
| MOB-09 | Feature parity checklist with web for every customer journey | no missing functionality, same rules and wording | P1 | M |
| MOB-10 | App and API version compatibility (older app, newer API) | graceful minimum-version message | P1 | A |
| MOB-11 | Performance: cold start, list scrolling, memory | within budget | P2 | M |
| MOB-12 | Accessibility: screen reader labels, contrast, tap size | acceptable | P2 | M |

### E.SEC Security (OWASP API Top 10, web and mobile)
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| SEC-01 | Broken object-level authorization: for EVERY resource in D7, call with another customer's ids (GET, PUT, DELETE, sub-resources) | 403 or 404, never data | P0 | A |
| SEC-02 | Broken function-level authorization: every admin route with customer, guest, support, technician tokens | denied exactly per matrix | P0 | A |
| SEC-03 | Mass assignment: role, status, price, userId, isInternal, discount, warranty price in create and update bodies | ignored or rejected | P0 | A |
| SEC-04 | Excessive data exposure: ciphertext fields, masked-only rule, other users' PII, internal notes, staff notes, audit data in customer responses; response shape diff against DTOs | none | P0 | A |
| SEC-05 | Injection: SQL (search, filters, sort, raw queries such as priority ordering), NoSQL-style JSON, header and log injection | inert | P0 | A |
| SEC-06 | XSS stored and reflected: names, addresses, ticket messages, help markdown, coupon titles, email templates, query params | escaped; CSP present | P0 | A |
| SEC-07 | CSV and formula injection in exports and imports | neutralized | P0 | A |
| SEC-08 | File upload: wrong MIME, double extensions, polyglots, SVG with script, 0 byte, oversized, path traversal in names | rejected; stored privately; magic bytes verified | P0 | A |
| SEC-09 | Storage: private bucket not listable, signed URLs expire and are scoped, keys unguessable | enforced | P0 | A |
| SEC-10 | Open redirect (?next, returnUrl, redirect) | internal only | P0 | A |
| SEC-11 | Rate limiting and brute force: login, forgot password, OTP, coupon validate, ticket create, inquiry, email send, search | limits and lockouts; Retry-After | P0 | A |
| SEC-12 | Enumeration: login, forgot password, coupon codes, order numbers, ticket numbers, referral codes | uniform responses | P1 | A |
| SEC-13 | Webhook security: signature, replay, tampered body, wrong content type | rejected safely | P0 | A |
| SEC-14 | Idempotency keys across users and endpoints | no cross-user replay | P0 | A |
| SEC-15 | Race conditions: coupon last unit, stock last unit, refund, withdrawal, buyback, booking | single winner | P0 | A |
| SEC-16 | CORS: allowed origins only, no wildcard with credentials; preflight behavior | correct per environment | P0 | A |
| SEC-17 | Security headers: HSTS, CSP, X-Content-Type-Options, frame protection, referrer policy, cache-control no-store on sensitive responses | present | P1 | A |
| SEC-18 | Secrets exposure: client bundles, source maps, /docs and Swagger, debug routes, .env files, stack traces, verbose errors in production profile | none exposed | P0 | A |
| SEC-19 | Encryption at rest: payout, refund and buyback details ciphertext in DB, versioned format, key length validation, startup failure when the key is missing | verified by SELECT | P0 | A |
| SEC-20 | Audit logging: reveals, role changes, price changes, approvals, exports; immutability triggers | logged, no UPDATE or DELETE | P0 | A |
| SEC-21 | Session and token handling: expiry, revocation, wrong-project token, token in URL, logout everywhere | correct | P0 | A |
| SEC-22 | PII in logs and error reports (emails, phones, addresses, tokens, OTPs, bank details) | masked or absent | P0 | A |
| SEC-23 | Dependency scan (`pnpm audit`), Docker and base image scan, secret scan on the repository and git history | no high or critical unresolved | P1 | A |
| SEC-24 | ZAP baseline on web and API (dev) | no high findings | P1 | A |
| SEC-25 | Clickjacking and iframe embedding of sensitive pages | blocked | P2 | A |
| SEC-26 | Account takeover paths: email change, password reset race, duplicate accounts, OAuth account linking | none | P0 | A |
| SEC-27 | Business logic abuse: coupon stacking, referral farming with new accounts, repeated returns, buyback of the same unit twice, lease and return loops | blocked or flagged | P0 | A |
| SEC-28 | Mobile: no secrets in the app bundle (service role key, encryption key), certificate handling, deep link hijack | verified | P0 | M |

### E.DAT Data integrity, concurrency, migrations
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| DAT-01 | Apply all migrations from an empty database; status clean; `migrate diff` empty; rollback scripts executed on a copy | works | P0 | A |
| DAT-02 | Constraint tests: CHECKs, unique and partial unique indexes, foreign keys RESTRICT (deleting parents with children fails), append-only triggers reject UPDATE and DELETE | enforced by the database | P0 | A |
| DAT-03 | Sequences: ticket, return, buyback, request, contract, order numbers unique under 50 parallel creations | unique | P1 | A |
| DAT-04 | Money integrity: sums of shares, refunds never above paid, ledger CHECK (earnings minus reserved minus withdrawn at least 0) | holds under concurrency | P0 | A |
| DAT-05 | Transaction rollback on injected failures at each step of order, refund, withdrawal, buyback payout, return approval | no partial state | P0 | A |
| DAT-06 | Idempotent jobs rerun (auto-close, SLA, ledger maturity, reminders, orphan cleanup) | no duplicates, no skips | P1 | A |
| DAT-07 | Time handling: IST boundaries (23:59:59, 00:00:00), month ends, leap day, financial year change, server clock in UTC | correct | P0 | A |
| DAT-08 | Unicode, emoji, very long text and RTL in names, addresses, tickets | stored and displayed safely, limits enforced | P2 | A |
| DAT-09 | Soft-archive semantics: archived items hidden publicly, retained in history | correct | P1 | A |
| DAT-10 | Seed idempotency and the dev-seed guard | refuses protected hosts | P0 | A |
| DAT-11 | Backup and restore drill on the dev database | data intact | P2 | M |
| DAT-12 | Cache coherence: admin change versus storefront, mobile, SSR revalidation | updated within the defined window | P1 | A |

### E.PERF Performance budgets (production build locally)
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| PERF-01 | Lighthouse mobile on home, products, PDP, cart | LCP at most 2.5 s, CLS at most 0.1, INP at most 200 ms, performance score at least 80 | P2 | A |
| PERF-02 | API latency (list products, product detail, cart, orders list, admin lists) under 20 concurrent users | p95 at most 500 ms locally, no errors | P2 | A |
| PERF-03 | N+1 queries on lists (count queries per request) | bounded | P2 | A |
| PERF-04 | Large datasets (10,000 products, 5,000 orders, 2,000 tickets) in lists and search | pagination and indexes keep responses fast | P2 | A |
| PERF-05 | Image optimization and caching headers | next/image, responsive sizes | P3 | A |
| PERF-06 | Render cold start | loading state shown, no false errors, retry works | P1 | M |
| PERF-07 | Memory and leak check during a 30-minute soak | stable | P3 | A |

### E.A11Y Accessibility (WCAG 2.1 AA basics)
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| A11Y-01 | axe on key pages (home, products, PDP, cart, checkout, login, account, help, admin tables) | zero critical or serious | P1 | A |
| A11Y-02 | Keyboard-only: browse, add to cart, check out, raise a ticket | complete journey, visible focus, logical order | P1 | A |
| A11Y-03 | Modals and drawers: focus trap, Esc, focus return, ARIA roles | correct | P1 | A |
| A11Y-04 | Forms: labels, errors announced, required indicators | correct | P1 | A |
| A11Y-05 | Contrast 4.5:1 text and 3:1 UI on the brand colors | meets | P1 | A |
| A11Y-06 | Zoom 200 and 400 percent, text spacing | no loss of content | P2 | M |
| A11Y-07 | Screen reader pass on checkout and order tracking | understandable | P2 | M |
| A11Y-08 | Reduced motion and no autoplay | respected | P3 | M |

### E.CMP Compatibility
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| CMP-01 | Chrome, Edge, Firefox, Safari latest on the smoke journeys and checkout | works | P1 | M |
| CMP-02 | Android Chrome and iOS Safari (real devices or emulators) | works, layout correct | P1 | M |
| CMP-03 | Mobile app on Android and iOS, two OS versions each, small and large phones | works | P1 | M |
| CMP-04 | Slow 3G and offline throttling | usable states | P1 | A |
| CMP-05 | Print layouts of invoices and receipts, PDF output | correct | P2 | M |

### E.SEO Metadata
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| SEO-01 | Titles, descriptions, canonical, Open Graph per page; product pages unique | present | P3 | A |
| SEO-02 | robots and sitemap; noindex on account, admin, checkout, order pages | correct | P2 | A |
| SEO-03 | 404 and 410 status codes; redirects 301 for /profile and legacy URLs | correct | P2 | A |
| SEO-04 | Structured data for products (if present) valid | valid | P3 | A |

### E.ENV Environment parity and deployment safety
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| ENV-01 | Production profile boot with dummy hosts: guard decision matrix (laptop versus Render, loopback, protected host) | per matrix | P0 | A |
| ENV-02 | Required variables validation per profile (names only) and `pnpm doctor` | clear failure messages | P0 | A |
| ENV-03 | /health and /health/ready for DB, migrations, Firebase, storage, mail | accurate, no secrets | P1 | A |
| ENV-04 | Deploy skew: api-client paths vs API routes; capabilities in /health; web disables unsupported features | no mismatches | P0 | A |
| ENV-05 | CORS and Firebase authorized domains per environment (localhost, preview, production) | login and API calls work | P0 | A |
| ENV-06 | Storage driver rules (Supabase in production, local only in dev) | enforced | P0 | A |
| ENV-07 | Mail configuration rules (verified sender domain, no free-mail From) | enforced | P0 | A |
| ENV-08 | Fallback and mock data flags | off in dev, explicit and visible when on | P0 | A |
| ENV-09 | Migration order and a production dry-run plan on a scratch copy | succeeds, rollback documented | P0 | A |
| ENV-10 | Local versus production behavior differences list | documented and understood | P1 | M |

### E.RES Resilience
| ID | Test | Expected | P | T |
|---|---|---|---|---|
| RES-01 | Database down mid-session and at startup | specific errors, recovery without restart where possible | P0 | A |
| RES-02 | API down or slow | web and mobile show retry states, no data loss | P0 | A |
| RES-03 | Payment gateway, mail provider, storage down | graceful, queued or clearly failed | P0 | A |
| RES-04 | Server restart during a job (auto-close, refund, upload confirm) | resumes safely | P1 | A |
| RES-05 | Duplicate and out-of-order webhooks and delayed callbacks | final state correct | P0 | A |
| RES-06 | Browser closed at each checkout step | reservations released, orders reconcile | P0 | A |
| RES-07 | Partial failures (image upload succeeded, ticket create failed) | cleanup, no orphans | P1 | A |
| RES-08 | Clock skew between servers | tokens and windows behave | P2 | A |

---

## F. EXPLORATORY CHARTERS (45 to 60 minutes each, notes and anomalies logged)
1. **The impatient clicker:** double-click and spam every submit (order, coupon, withdrawal, refund, booking, ticket).
2. **The two-tab user:** same account in two tabs and two devices, mutate in one, act in the other.
3. **The time traveler:** move the clock around every window boundary and month end.
4. **The role hopper:** log in as each role in sequence in the same browser and probe URLs from the previous role.
5. **The curious customer:** change ids, numbers and keys in URLs and API calls of orders, returns, tickets, attachments.
6. **The coupon hunter:** stack, replay, brute-force, guess codes, abuse referral farming with fresh accounts.
7. **The unreliable commuter:** throttle, drop and resume network during checkout, upload and payment on mobile.
8. **The storyteller:** unusual text in every input (emoji, RTL, 5,000 characters, HTML, SQL, scripts, zero-width, spaces only).
9. **The money auditor:** follow one order's amounts from PDP to cart to checkout to payment to invoice to refund to admin analytics.
10. **The admin versus customer:** change prices, settings and statuses in admin and watch every customer surface and mobile.
11. **The returns lawyer:** edge cases around windows, items, quantities, coupons, warranty add-on, rent and buyback.
12. **The deployment skeptic:** compare local, production-like build and the deployed site for config drift and skew.
13. **The inbox detective:** every email trigger, content, links, spam placement and failure behavior.
14. **The empty and the huge:** brand new account, empty database, then thousands of rows.
15. **The mobile purist:** complete every customer journey on a physical phone only.

---

## G. REGRESSION TRAPS FROM THIS PROJECT'S HISTORY (always re-run)
1. `/products` empty or mock data shown while the API or database is down; dev server pointed at the wrong database.
2. Login `?next=` ignored; open redirect; role-aware redirect; redirect loops for forbidden roles.
3. Firebase sign-in succeeded but sync failed, leaving a half-signed-in user; database errors reported as authentication errors.
4. Footer hydration mismatch and stale `.next` builds; brand theme lost after refactors; admin mixed dark and light themes.
5. Web ahead of API (missing `/auth/email-verification`, new cart fields); verification gate locking out users including admin.
6. Production API crashing on the protected-host guard; required environment variables missing on Render.
7. Emails not delivered: unverified Resend domain, Gmail as sender, SMTP blocked on free Render, stdout fallback hiding failures.
8. Return window computed from `updatedAt`; lease items returnable; coupon routes writable by SUPPORT; priority sorted alphabetically.
9. Lease price estimated by formula and charged; rent items without a price orderable.
10. Hardcoded "1-Year" warranty versus 6 months in the terms; buyback tiers four versus six.
11. CASCADE deletes removing support history; unique key blocking a second buyback request after rejection.
12. Duplicate account systems (/profile versus /account), duplicate wishlist routes, dead help actions that open WhatsApp.
13. Fake client-side coupons (FIRST500, MITRA prefix) and client-trusted totals.
14. Referral earnings never credited; ledger CHECK violated by refunds after withdrawals.
15. Raw errors such as "Cannot POST" shown to users; generic 503 text hiding the cause.

---

## H. SMOKE SUITE (about 40 checks, run on every build)
GEN-01, GEN-04, GEN-06, GEN-12; AUTH-01, AUTH-04, AUTH-07, AUTH-09, AUTH-10, AUTH-13, AUTH-16, AUTH-18; CAT-01, CAT-05, CAT-09; PDP-03, PDP-07, PDP-16; CRT-01, CRT-05, CRT-12; CHK-01, CHK-05, CHK-07, CHK-09; PAY-01; ORD-01, ORD-04, ORD-10; RET-01 with D1 boundary rows; CPN-06, CPN-12; REF-06, REF-08; SUP-02, SUP-05; ADM-01, ADM-04, ADM-11, ADM-15; SEC-01, SEC-02, SEC-03, SEC-10; DAT-01, DAT-02; ENV-01, ENV-04; mobile: login, browse, add to cart, order, ticket, return.

---

## I. REPORTING FORMATS

**RESULTS.csv columns:** test_id, module, priority, feature_status, type, status (PASS, FAIL, BLOCKED, NOT_BUILT, N/A), evidence_path, bug_ids, executed_at, executed_by, build, notes.

**Bug template (BUG_LIST.md):**
```
BUG-###: one-line title
Module / test id: 
Platform: web | mobile | API | admin | database | email | infra
Environment and build: 
Severity: Blocker | High | Medium | Low      Priority: P0 | P1 | P2 | P3
Preconditions / test data: 
Steps to reproduce (numbered, exact): 
Expected result: 
Actual result: 
Evidence: screenshot, request and response (masked), log line, SQL SELECT, test output
Root cause: confirmed | suspected | unknown (why)
Regression of history item (section G): yes/no which
Introduced by: recent change | pre-existing (evidence)
Workaround: 
Suggested fix direction: 
Status: open
```

**TEST_REPORT.md must contain:** executive summary and go or no-go against the exit criteria; counts by module and priority (pass, fail, blocked, not built); coverage gaps; top 10 risks; defects by severity and module; security summary; performance and accessibility results; environment parity findings; flaky tests; owner actions (variables, DNS, console settings, real-device tests); and the retest plan.
