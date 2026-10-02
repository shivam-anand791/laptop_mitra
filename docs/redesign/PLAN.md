# LaptopMitra Frontend & Motion Redesign Plan (apps/web)

> **Document Version:** 1.1.0  
> **Status:** Phase 0 — Resubmitted for User Review & Approval  
> **Target Application:** `apps/web` (Next.js 16 App Router, Turborepo)

---

## 1. Executive Summary & Design Vision

This project executes a visual and motion redesign of `apps/web` based on **Image 1** (Target Design System & Layouts) while preserving and elevating proven conversion sections from **Image 2** (Deal of the Day / Flash Sale) and **Image 3** (Branding, Live Stats, Authorized Partners marquee).

### Primary Design Pillars
1. **Art Direction**: Deep enterprise navy (`#0B1F4B`, `#071433`) for high-impact hero & footer anchors; vibrant primary blue (`#1D6FF2`, hover `#1558C0`) for high-conversion CTAs; clean white (`#FFFFFF`) and ice/slate-grey surfaces (`#F5F7FA`, `#F8FAFC`); crisp borders (`#E4E9F2`); vibrant emerald (`#16A34A`) for stock/warranty and warm amber/orange (`#F97316`) for badges.
2. **Typography**: Google Font **Inter** via `next/font/google`, utilizing variable weights (400, 500, 600, 700, 800, 900) with `tabular-nums` applied strictly and exclusively to prices, counters, and timers.
3. **Motion Engineering**: Zero-bloat, high-frame-rate (60–120fps) motion layer powered by GPU-composited CSS transforms/opacity and lightweight React motion primitives with strict `prefers-reduced-motion` compliance.

---

## 2. Phase 0.1 — Complete Codebase Audit

### 2.1 Customer Routes & Pages Audit

| Route / File | Image 1 Reference Section | Action Required | Scope & Details |
|---|---|---|---|
| `app/layout.tsx` | Global Shell | **Restyle** | Configure Next.js font variables, global body background (`#F5F7FA`), metadata, smooth scrolling, toast provider. |
| `app/page.tsx` | Target Home Page + Live Img 2 & 3 | **Restructure & Restyle** | Rebuild Hero with 4-item trust strip; Shop by Category (5 real categories); "More than a purchase" banner; Trending Inventory; Deal of the Day (Image 2, static badge); Real Stats CountUp (Image 3); Authorized Partners infinite marquee (Lenovo, HP, Dell only); Flexible Leasing & Exchange; Testimonials; Footer. |
| `app/products/page.tsx` | Target Store / Listing Page | **Restructure & Restyle** | Add top category header banner with bulk quote callout card; filter sidebar with real-time facet counts computed after other filters; sort dropdown; responsive product grid; pagination; empty state. |
| `app/products/[id]/page.tsx` | Target Product Detail Page | **Restructure & Restyle** | Breadcrumbs; multi-thumbnail gallery with smooth preview switch & hover zoom; price block with real MRP savings compute; warranty/delivery trust chips; Add to Cart / Buy Now with micro-interactions; WhatsApp quote button; tabbed specifications (Overview, Specs, In The Box, Warranty, Reviews); "Why buy from LaptopMitra" trust block; "You may also like" CSS scroll-snap carousel. |
| `app/cart/page.tsx` | Target Cart Drawer / Page | **Restyle** | Restyle item cards, quantity stepper, price breakdown (Subtotal, Mitra discount, Total), and empty cart state. *(Note: Pincode delivery lookup is omitted as no backend verification API exists)* |
| `app/checkout/page.tsx` | Checkout Flow | **Restyle** | Modern clean single-page checkout; clear steps (Shipping, Mitra Code / Discount, Razorpay payment); floating order summary card. *(Note: Razorpay payment & backend logic untouched; COD is not added)* |
| `app/profile/page.tsx` | Account / My Orders / Referral | **Restyle** | Elevate tabbed dashboard: My Orders list with status badges & tracking info; Mitra Partner Referral dashboard (shareable code, copy animation, payout metrics); Account Details. |
| `app/login/page.tsx` | Auth Modal / Card in Image 1 | **Restyle** | Standard credentials login form restyled to match modern card design. *(Auth endpoints & logic untouched; no demo/guest bypass added)* |
| `app/register/page.tsx` | Auth / Mitra Partner Signup | **Restyle** | Matching aesthetic to login; partner tier explanation cards; input validation styling. *(Auth endpoints untouched)* |
| `app/wishlist/page.tsx` | Wishlist Page (Header heart) | **Restyle** | 4-column responsive grid of saved products; quick add-to-cart; empty state illustration. |
| `app/not-found.tsx` *(To Create)* | 404 Error Screen | **New Page** | Branded 404 page with custom artwork, search input, and links to top categories. |
| `app/error.tsx` *(To Create)* | Error Boundary | **New Page** | Graceful error screen with retry button and direct WhatsApp support CTA. |
| `app/loading.tsx` *(To Create)* | Global Loading Screen | **New Page** | Minimal branded top-bar loading indicator & skeleton shell. |

---

### 2.2 Admin Routes — DEFERRED / OUT OF SCOPE

> [!IMPORTANT]
> The following 7 admin routes are strictly **DEFERRED / OUT OF SCOPE**. No changes or edits will be made to admin routes during this project.

- `app/admin/layout.tsx` — **DEFERRED / NO EDITS**
- `app/admin/page.tsx` — **DEFERRED / NO EDITS**
- `app/admin/analytics/page.tsx` — **DEFERRED / NO EDITS**
- `app/admin/orders/page.tsx` — **DEFERRED / NO EDITS**
- `app/admin/products/page.tsx` — **DEFERRED / NO EDITS**
- `app/admin/settings/page.tsx` — **DEFERRED / NO EDITS**
- `app/admin/users/page.tsx` — **DEFERRED / NO EDITS**

---

### 2.3 Shared Components Audit (`apps/web/components`)

| Component | Image 1 / Target Mapping | Action Required | Scope & Enhancements |
|---|---|---|---|
| `CustomerLayout.tsx` | Global Wrapper | **Restyle** | Wrap all customer pages; manage safe-area insets; include planned floating contact widget. |
| `Navbar.tsx` | Target Header & Nav | **Restructure & Restyle** | Top trust announcement bar (using real data claims); brand logo with certified badge; category navigation dropdown; modern search pill; Wishlist & Cart counter badges with pop animations; User profile dropdown; Mobile drawer navigation. |
| `Footer.tsx` | Target Dark Navy Footer | **Restructure & Restyle** | 4-column link layout (Shop, Support, Company, Legal); payment badges; OEM partner strip (strictly Lenovo, HP, Dell); copyright & legal links. *(Unbacked newsletter form submission is omitted)* |
| `ProductCard.tsx` | Target Product Card & Promo Card | **Restructure & Restyle** | Card container with hover lift; primary image with smooth zoom; REFURB / Best Seller / Hot Deal badges; real MRP vs offer price discount badge; spec line (Processor \| RAM \| Storage); bulk price estimate; quick WhatsApp quote button; accessible Add to Cart & Wishlist buttons. |
| `FilterSidebar.tsx` | Target Filter Sidebar | **Restructure & Restyle** | Accordion checkbox sections (Category, Brand, Processor, RAM, Storage, Condition Grade, Price Range); real-time count badges computed against other active filters; Buy/Lease toggle; clean reset button; mobile bottom-sheet drawer. |
| `AnimatedCounter.tsx` | Live Stats (Image 3) | **Restyle & Upgrade** | Tabular numbers; intersection observer trigger once; fixed container widths to eliminate layout shift (CLS = 0). Will be wired to verified canonical figures only after user confirmation. |
| `TrustStrip.tsx` | 4-Item Trust Strip (Image 1 Hero) | **Restructure & Restyle** | 4-column responsive grid (100% Genuine Products, Bulk Orders & Special Pricing, PAN India Delivery, Dedicated Support). |
| `PriceDisplay.tsx` | Target Price Block | **Restyle** | Indian currency formatting (`en-IN`), strike-through original MRP, discount percentage badge, bulk unit price calculation. |
| `QuantityStepper.tsx` | Cart Quantity Control | **Restyle** | Accessible decrement/increment controls with tactile press states and disabled stock limits. |
| `SearchBar.tsx` | Target Search Bar | **Restyle** | Expandable search bar with clear button, keyboard navigation, and instant query debouncing. |
| `SpecTag.tsx` | Product Spec Pills | **Restyle** | Clean slate-blue chip styling for technical specs. |
| `EmptyState.tsx` | Empty States (Cart, Wishlist, Search) | **Restyle** | Integrated custom illustration, clear messaging, and primary action CTA. |
| `FloatingContactButtons.tsx` *(Planned)* | Live Call & WhatsApp (Image 2 & 3) | **New Component (Planned)** | Non-intrusive floating widget positioned at bottom right/left with safe-area offset, subtle pulse ring via GPU scale/opacity pseudo-element, 44px min touch target, and high z-index without blocking card interactions. |
| `components/ui/Badge.tsx` | Badges & Chips | **Restyle** | Standardized variant badges: `refurb`, `best-seller`, `hot-deal`, `in-stock`, `discount`, `grade`. |
| `components/ui/Button.tsx` | Primary, Secondary, Ghost Buttons | **Restyle** | Modern rounded-xl buttons with subtle hover lift, loading spinner state, and active press scale. |
| `components/ui/Skeleton.tsx` | Skeleton Loaders | **Restyle** | Smooth shimmer animation matching new slate-grey surface tokens. |
| `components/ui/Toast.tsx` | Notification Toasts | **Restyle** | Sleek glassmorphism toast popup with slide-in animation and dismiss timer. |
| `components/ui/Modal.tsx` | Dialogs & Quick-Views | **Restyle** | Backdrop blur, smooth scale-in, ESC key support, focus trap. |

---

## 3. Phase 0.2 — Stack & Architecture Analysis

| Layer / Tool | Current Version / Tooling | Target Approach for Redesign |
|---|---|---|
| **Framework** | Next.js `16.3.4` (App Router) | Maintain Next.js 16 App Router; keep Server/Client component boundary clear. |
| **UI Library** | React `19.2.8` | Leverage React 19 hooks (`useActionState`, `useTransition`, `use`). |
| **CSS Framework** | Tailwind CSS `v4` (`@tailwindcss/postcss: ^4`) | Use Tailwind v4 `@theme` CSS custom properties and utility classes. |
| **Tailwind Config File** | `apps/web/tailwind.config.ts` | Confirmed present in `apps/web/tailwind.config.ts` (140 lines) and referenced via `@config "../tailwind.config.ts"` in `globals.css`. |
| **Design Tokens** | `apps/web/lib/design-tokens.ts` (Planned) | Keep all tokens strictly within `apps/web/lib/design-tokens.ts` as plain TypeScript objects with zero web-only or outside dependencies. |
| **Typography** | `next/font/google` (Inter) | Single font family **Inter** loaded via `next/font/google` with Latin subset. `tabular-nums` utility class applied strictly to numeric fields (prices, counters, timers) and NOT globally. |
| **Images** | `next/image` + standard `<img>` | Enforce `next/image` with explicit `sizes`, `priority` on above-the-fold hero, WebP/AVIF formats, and zero CLS. |
| **Hero Carousel** | Manual interval / state in `page.tsx` | Accessible carousel with touch swipe gestures, autoplay with visual progress bar, keyboard navigation, pause on hover/focus-within/touch, and a visible Pause/Play toggle. |
| **Countdown Timer** | Looping `setInterval` in `page.tsx` (resetting to 12h) | **Audit Result**: No `endsAt` or `dealEndTime` field exists in the product catalog or API. **Action**: Countdown timer is REMOVED to eliminate fake urgency; a static, high-contrast "Deal of the Day" badge is rendered instead. |

---

## 4. Phase 0.3 — Motion & Performance Research

### 4.1 Animation Approach Evaluation

| Approach | Bundle Impact | React 19 & Next.js 16 Compatibility | Official Source & Verdict |
|---|---|---|---|
| **CSS-Only (Keyframes + Transitions)** | **0 KB** | 100% Native, SSR-friendly | [MDN CSS Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations) — **Primary Choice** for hover lifts, marquee loops, shimmer, pulse rings, and modal fade-ins. |
| **Lightweight Custom React Hooks** | **< 1 KB** | 100% Native (`rAF`, `IntersectionObserver`) | [MDN IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) — **Primary Choice** for `useReducedMotion`, `AnimatedCounter`, and viewport reveals. |
| **`motion` (formerly Framer Motion v12)** | **~4.5 KB initial sync**, but **~17–20 KB async** for `domAnimation` features | Fully compatible with React 19 & App Router | [Motion React Bundle Size Docs](https://motion.dev/docs/react-bundle-size) — Initial synchronous entry is ~4.5KB, but loading the `domAnimation` feature bundle brings total weight to ~17-20KB. **Selective Choice** only if complex layout physics are approved. |
| **GSAP** | **25–60 KB** minified | Client-only, heavy bundle | [GreenSock Webflow Licensing](https://gsap.com/pricing/) — GSAP became free for commercial use under standard Webflow licensing in 2024/2025. However, it is **Rejected** due to heavy bundle weight (25–60 KB) and lack of React 19 Server Component primitives compared to zero-cost CSS. |
| **Lottie (`dotlottie` / `lottie-web`)** | **~60–70 KB** gzipped | Client-heavy | [Lottie Web Specs](https://github.com/airbnb/lottie-web) — **Rejected** in favor of CSS micro-animations and lightweight vector SVG paths. |

### 4.2 Performance & Core Web Vitals Guardrails
1. **Cumulative Layout Shift (CLS = 0)**:
   - Numerical animations use fixed tabular width containers (`tabular-nums`).
   - Image wrappers have fixed aspect ratios (`aspect-[16/10]`, `aspect-[4/3]`, `aspect-square`).
   - Skeletons match final rendered element dimensions exactly.
2. **Interaction to Next Paint (INP <= 200ms standard, <= 100ms internal target)**:
   - [Google Core Web Vitals INP Standard](https://web.dev/articles/inp) classifies `<= 200ms` as **Good**. Our internal engineering target is `<= 100ms`.
   - Zero animations on layout-triggering properties (`width`, `height`, `margin`, `top`, `left`).
   - Only composited GPU properties: `transform` (GPU 3D layer) and `opacity`.
3. **Largest Contentful Paint (LCP < 2.0s)**:
   - Hero laptop visual uses `priority` loading in `next/image`.
   - Critical fonts preloaded with `display: swap`.
4. **Accessibility (`prefers-reduced-motion`)**:
   - `useReducedMotion()` hook disables all multi-frame transitions and continuous animations, providing instantaneous static states.

---

## 5. Phased Implementation Plan

### Phase 1: Foundation & Design System Tokens
- **Objective**: Establish color tokens, typography, motion primitives, and base UI components.
- **Tasks**:
  - [ ] Update `globals.css` with Image 1 palette (`lm-navy`, `lm-blue`, `lm-page`, `lm-card`, `lm-border`, `lm-green`, `lm-orange`).
  - [ ] Create `apps/web/lib/design-tokens.ts` with plain TS objects (no files outside `apps/web`).
  - [ ] Build motion primitive hooks: `useReducedMotion`, `useIntersectionObserver`.
  - [ ] Build UI base primitives: `Button`, `Badge`, `Skeleton`, `Toast`, `Modal`, `PriceDisplay`, `SpecTag`.
  - [ ] Restyle `CustomerLayout.tsx`, `Navbar.tsx`, `Footer.tsx`.
  - [ ] Create planned `FloatingContactButtons.tsx` (safe-area aligned Call & WhatsApp buttons with GPU-composited scale/opacity pulse).
- **Files Touched**: `apps/web/app/globals.css`, `apps/web/app/layout.tsx`, `apps/web/lib/design-tokens.ts`, `apps/web/components/Navbar.tsx`, `apps/web/components/Footer.tsx`, `apps/web/components/CustomerLayout.tsx`, `apps/web/components/FloatingContactButtons.tsx`, `apps/web/components/ui/*`.

### Phase 2: Image Assets Generation & Integration
- **Objective**: Create and integrate all environmental and category artwork according to `IMAGE_PLAN.md`.
- **Tasks**:
  - [ ] Generate 5 verified category visual artworks (Business, Student, Gaming, Premium/Ultrabooks, Apple MacBooks).
  - [ ] Generate Hero laptop scene visual (2400x1200 desktop + 800x1000 mobile crop).
  - [ ] Generate "More than a purchase" feature banner artwork.
  - [ ] Generate Bulk Order promo callout artwork.
  - [ ] Generate Leasing & Exchange illustration visuals.
  - [ ] Generate Empty state & 404 error illustrations.
  - [ ] Place generated assets in `apps/web/public/images/generated/` with prompt metadata.
- **Files Touched**: `apps/web/public/images/generated/*`, `docs/redesign/IMAGE_PLAN.md`.

### Phase 3: Home Page Rebuild
- **Objective**: Rebuild `apps/web/app/page.tsx` according to Image 1 + Image 2 & 3.
- **Tasks**:
  - [ ] Hero Section: Dark navy theme, strong headline, CTAs, 4-item trust strip.
  - [ ] Shop by Category: 5 verified category cards with hover zoom and badge.
  - [ ] "More than a purchase" banner: 3 quality check pills with angled device graphic.
  - [ ] Featured / Trending Laptops Grid: Product card grid with tabs (Best Sellers / New Arrivals).
  - [ ] Deal of the Day (Image 2): Premium gradient card with static "Deal of the Day" badge (no fake countdown timer).
  - [ ] Live Stats (Image 3): 4 animated stats with tabular numbers, wired only after user confirms canonical numbers.
  - [ ] Authorized Partners Strip (Image 3): Infinite marquee with Lenovo, HP, Dell logos, edge fade mask, pause on hover/focus/touch, visible pause button.
  - [ ] Flexible Leasing & Exchange Sections: 2-column cards matching Image 1 styling.
  - [ ] Verified Testimonials: 3-column customer quote cards using existing text.
  - [ ] Mitra Partner Banner: High-contrast affiliate referral CTA.
- **Files Touched**: `apps/web/app/page.tsx`, `apps/web/components/ProductCard.tsx`, `apps/web/components/AnimatedCounter.tsx`.

### Phase 4: Store / Catalog Listing Page
- **Objective**: Rebuild `apps/web/app/products/page.tsx` matching Image 1 Store layout.
- **Tasks**:
  - [ ] Category Banner with "Need bulk orders? Request a Quote" promo card.
  - [ ] Collapsible Filter Sidebar (desktop) & Bottom Sheet (mobile).
  - [ ] Real-time facet counts computed after applying other active filters.
  - [ ] Anchored Filter Normalization (display & grouping only; raw underlying values matched).
  - [ ] Product Grid, Sorting dropdown, and Pagination controls.
  - [ ] Skeleton loaders and Empty State integration.
- **Files Touched**: `apps/web/app/products/page.tsx`, `apps/web/components/FilterSidebar.tsx`.

### Phase 5: Product Detail Page
- **Objective**: Rebuild `apps/web/app/products/[id]/page.tsx` matching Image 1 Product Detail layout.
- **Tasks**:
  - [ ] Breadcrumb navigation (`Home > Laptops > [Brand] [Model]`).
  - [ ] Multi-thumbnail gallery with active indicator and hover preview zoom.
  - [ ] Pricing block with real MRP savings compute, warranty & free delivery chips.
  - [ ] "In Stock / Ready for Dispatch" status chip with real stock count.
  - [ ] Add to Cart and Buy Now buttons with micro-interaction state changes.
  - [ ] WhatsApp Quote action button.
  - [ ] Tabbed specifications: Overview, Specs, In The Box, Warranty, Reviews.
  - [ ] "Why Buy from LaptopMitra?" guarantee card.
  - [ ] "You may also like" CSS scroll-snap carousel (no autoplay).
- **Files Touched**: `apps/web/app/products/[id]/page.tsx`.

### Phase 6: Cart, Checkout & User Account
- **Objective**: Elevate Cart, Checkout, and Profile pages to Image 1 design language.
- **Tasks**:
  - [ ] Cart Page (`app/cart/page.tsx`): Item cards, stepper, price summary card.
  - [ ] Checkout Page (`app/checkout/page.tsx`): Clean form layout, coupon validation, Razorpay gateway card.
  - [ ] Account Dashboard (`app/profile/page.tsx`): Order history, Mitra referral code & earnings metrics, profile details.
  - [ ] Auth Pages (`app/login/page.tsx`, `app/register/page.tsx`): Polished frosted cards (no demo/guest bypass added).
- **Files Touched**: `apps/web/app/cart/page.tsx`, `apps/web/app/checkout/page.tsx`, `apps/web/app/profile/page.tsx`, `apps/web/app/login/page.tsx`, `apps/web/app/register/page.tsx`.

### Phase 7: Supporting Pages, 404, Error & Loading States
- **Objective**: Complete remaining routes and error boundaries for consistent polish.
- **Tasks**:
  - [ ] Build `app/not-found.tsx` with custom illustration and category shortcuts.
  - [ ] Build `app/error.tsx` with friendly recovery actions.
  - [ ] Build `app/loading.tsx` with route transition skeleton.
  - [ ] Restyle Wishlist (`app/wishlist/page.tsx`).
- **Files Touched**: `apps/web/app/not-found.tsx`, `apps/web/app/error.tsx`, `apps/web/app/loading.tsx`, `apps/web/app/wishlist/page.tsx`.

### Phase 8: Performance, Accessibility & Final QA
- **Objective**: Comprehensive Lighthouse auditing, responsive testing, and motion verification.
- **Tasks**:
  - [ ] Lighthouse audits on Mobile & Desktop across Home, Store, Product Detail, and Cart.
  - [ ] Full viewport testing: 360px, 390px, 768px, 1024px, 1440px.
  - [ ] Verify `prefers-reduced-motion` across all animated components.
  - [ ] Keyboard navigation and ARIA attribute verification on all interactive elements.
  - [ ] Clean up any unused code or temporary assets.
- **Files Touched**: All relevant components in `apps/web`.

---

## 6. Filter Normalization & Facet Counting Rules

### 6.1 Parsing Rules (Strictly Anchored Regex)
1. **Storage Column Parsing**:
   - Anchored pattern: `/^(\d+)\s*(GB|TB)?\s*(SSD|HDD|NVME|EMMC)?$/i`
   - Merge **only pure formatting variants** where numeric capacity and unit are unambiguous:
     - `"256 GB SSD"`, `"256GB SSD"`, `"256 gb"` -> Group display label: **`256GB SSD`**
     - `"512 GB SSD"`, `"512GB SSD"`, `"512 gb"` -> Group display label: **`512GB SSD`**
     - `"1 TB SSD"`, `"1TB SSD"`, `"1000GB SSD"` -> Group display label: **`1TB SSD`**
   - **Ambiguous or Unrecognized Values**: Values such as `"225"`, `"32"`, or non-standard capacity strings are **NOT remapped or guessed**. They are preserved and displayed exactly as their raw string (e.g. `"225"`) and reported directly to the user.
2. **RAM Column Parsing**:
   - Anchored pattern: `/^(\d+)\s*(GB)?$/i`
   - Formatting merge only:
     - `"8 GB"`, `"8GB"`, `"8 gb"` -> Group display label: **`8GB`**
     - `"16 GB"`, `"16GB"`, `"16 gb"` -> Group display label: **`16GB`**
     - `"32 GB"`, `"32GB"`, `"32 gb"` -> Group display label: **`32GB`**
     - `"64 GB"`, `"64GB"`, `"64 gb"` -> Group display label: **`64GB`**
3. **Condition Column Parsing**:
   - Extracted from `metadata.condition` text in data.
   - If `metadata.condition` contains `"A+"` or `"PRISTINE"`, grouped under **`Grade A+`**.
   - If `metadata.condition` contains `"A"` or `"EXCELLENT"`, grouped under **`Grade A`**.
   - If `metadata.condition` is missing, grouped under **`Unspecified`**. No fake grades are invented.

### 6.2 Filter & Count Matching Implementation
- **Display Label**: Clean standardized group label shown next to checkbox.
- **Underlying Filter Matching**: When a checkbox group (e.g. `256GB SSD`) is selected by the user, the filter predicate matches against all raw underlying values assigned to that group:
  ```typescript
  // Example matching logic:
  const isStorageMatch = selectedStorageGroups.some(group => 
    group.rawValues.includes(product.metadata?.storage?.trim() || '')
  );
  ```
- **Facet Counts**: The count displayed on each checkbox dynamically sums all products that match any of the group's raw values when all *other* active filters are applied.

---

## 7. Stats & Deal of the Day Audit

### 7.1 Stats Conflict Report
- **`apps/web/app/page.tsx:250`**: `<AnimatedCounter target={50} suffix="K+" />` with label `"Laptops Delivered"`.
- **`apps/web/app/page.tsx:600`**: Headline claims `"Trusted by 50,000+ Professionals & Teams"`.
- **Live Site Screenshot (Image 3)**:
  - `1500+ DEVICES SOLD`
  - `27+ CORPORATE CLIENTS`
  - `95% SATISFACTION RATE`
  - `2+ YEARS EXPERIENCE`
- **Resolution**: `50,000+` directly conflicts with `1500+`. `95% Satisfaction Rate` has no database source. **Counters will not be hardwired or animated until the user explicitly confirms the canonical numbers.**

### 7.2 Deal of the Day Audit
- **`apps/web/app/page.tsx:135`**: `const [timeLeft, setTimeLeft] = useState({ hours: 7, minutes: 24, seconds: 45 })` with fake looping `setInterval`.
- **`apps/web/app/page.tsx:173`**: `const dealProduct = products[0]`.
- **Product Schema (`apps/web/lib/types.ts`)**: No `endsAt`, `dealEndTime`, or `isDealOfTheDay` field exists.
- **Resolution**: No end-time field exists. Countdown timer is REMOVED. The Deal of the Day product card will render a static, high-contrast "Deal of the Day" badge with no fake countdown.
