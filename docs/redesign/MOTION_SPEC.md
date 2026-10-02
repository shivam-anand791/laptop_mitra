# LaptopMitra Motion & Interaction Specification

> **Document Version:** 1.1.0  
> **Status:** Phase 0 — Resubmitted for User Review & Approval  
> **Target Application:** `apps/web` (Next.js 16 + React 19)

---

## 1. Core Motion Philosophy & Accessibility Guardrails

The motion system for LaptopMitra delivers a high-performance e-commerce experience that feels responsive, snappy, and tactile without introducing layout shift or bundle bloat.

### Engineering Guardrails
1. **Composited GPU Layers Only**: Animations strictly manipulate `transform` and `opacity`. Direct transitions on `box-shadow` are replaced with opacity transitions on `::after` pseudo-elements. Layout properties (`grid-template-rows`) are documented as deliberate, isolated, user-triggered exceptions.
2. **Zero Layout Shift (CLS = 0)**: Numerical animations use `tabular-nums` in fixed-width containers; skeletal loaders match exact content geometry.
3. **Accessibility First (`prefers-reduced-motion`)**: Every animation provides an immediate, static fallback when reduced motion is requested at the OS level.
4. **WCAG 2.2.2 Compliance (Pause, Stop, Hide)**: Any moving or continuous content (marquee, autoplay carousel) provides:
   - A visible Pause/Play button control.
   - Automatic pause on pointer hover (`:hover`), keyboard focus within (`:focus-within`), and touch press.
5. **Screen Reader Timer Accessibility**: Any numerical timer elements must have display digits marked with `aria-hidden="true"` and provide a single static label or `role="timer"` with `aria-live="off"` to prevent per-second auditory pollution.
6. **Performance Budget**: Motion bundle overhead is capped at **< 1 KB** by utilizing native CSS keyframes and zero-dependency custom React hooks (`rAF`, `IntersectionObserver`).

---

## 2. Production Motion Specification (Approved Scope)

Below is the definitive shortlist of motion primitives and component interactions.

| # | Animation Name | Where Used | Trigger | Duration & Easing | Implementation | Reduced Motion Fallback | Bundle Cost |
|---|---|---|---|---|---|---|---|
| **1** | **`ScrollReveal` (Staggered Fade-Up)** | Section headings, category cards, benefit rows | Intersection Observer (viewport threshold 0.15) | `450ms` `cubic-bezier(0.16, 1, 0.3, 1)` (spring-out) | GPU `opacity` and `transform: translateY(16px -> 0)` | Elements render immediately at `opacity: 1`, `translateY(0)` | **0 KB** |
| **2** | **`CountUp` (Stats Counter)** | Home Branding & Stats (Image 3) | Intersection Observer (enters viewport once) | `1800ms` `cubic-bezier(0.16, 1, 0.3, 1)` | Custom hook with `requestAnimationFrame` and tabular font numbers | Displays final number instantly without counting | **~0.4 KB** |
| **3** | **`FlipCardTransition`** | Deal of the Day card state changes | Product switch / state change | `300ms` `cubic-bezier(0.34, 1.56, 0.64, 1)` | GPU `transform: rotateX()` card flip with `aria-hidden="true"` on flipping elements | Digits swap instantaneously without rotation | **0 KB** |
| **4** | **`InfiniteMarquee` (Partner Strip)** | "Authorized Partners" OEM strip (Lenovo, HP, Dell) | Continuous loop (auto-running) with **visible Pause/Play button** | `28s` `linear` infinite loop | Pure CSS `translateX(-50%)` with duplicated track (`aria-hidden="true"` on duplicate), edge gradient masks, pause on hover/focus-within/touch, and grayscale-to-color on hover | Static, horizontally centered flex strip with wrapping | **0 KB** |
| **5** | **`CardHoverLift`** | Product cards, category cards, benefit tiles | Pointer hover / focus-visible | `250ms` `cubic-bezier(0.2, 0, 0, 1)` | GPU `transform: translateY(-4px)` + `opacity` transition on a pre-rendered `::after` shadow element (0 paint cost) | Subtle border color change only; zero translation | **0 KB** |
| **6** | **`ImageZoom`** | Product cards, Category card thumbnails | Card pointer hover | `400ms` `cubic-bezier(0.2, 0, 0, 1)` | GPU `transform: scale(1.05)` within `overflow-hidden` container | Static image scale; no zoom | **0 KB** |
| **7a** | **`HeroCarouselSlide`** | Home Hero Carousel | Autoplay timer (5s) or visible nav arrows with **visible Pause/Play button** | `400ms` `cubic-bezier(0.25, 1, 0.5, 1)` | GPU `transform: translateX()` slide; pauses on hover, focus-within, touch, and user toggle | Instant slide swap | **~0.5 KB** |
| **7b** | **`ProductCarouselScroll`** | Product Detail "You May Also Like" | User touch swipe or scroll arrow click (**NO autoplay**) | Native momentum scroll | Native CSS Scroll-Snap (`scroll-snap-type: x mandatory`, `scroll-behavior: smooth`) | Instant discrete scroll | **0 KB** |
| **8** | **`HeroDotProgress`** | Active pagination dot in Hero Carousel | Active slide interval (5000ms) | `5000ms` `linear` | GPU `transform: scaleX(0 -> 1)` with `transform-origin: left` | Solid filled active dot without progress animation | **0 KB** |
| **9** | **`AddToCartBump`** | Product card "Add to Cart" button & Header cart badge | User click on Add to Cart | `350ms` `cubic-bezier(0.34, 1.56, 0.64, 1)` (elastic scale) | GPU keyframe `transform: scale(1 -> 0.94 -> 1.12 -> 1)` | Badge number changes instantly without bounce | **0 KB** |
| **10** | **`WishlistHeartPop`** | Wishlist heart icon button on cards & PDP | User click on Heart | `400ms` `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | GPU keyframe `transform: scale(1 -> 0.8 -> 1.35 -> 1)` + fill color transition | Instant icon fill color change | **0 KB** |
| **11** | **`FloatingButtonPulse`** | Planned Floating Call & WhatsApp buttons | Continuous subtle attention loop | `3000ms` `ease-in-out` infinite loop | GPU `::after` pseudo-element with `transform: scale(1.0 -> 1.4)` and `opacity: 0.6 -> 0` (zero `box-shadow` reflows) | Static drop shadow; zero pulse ring | **0 KB** |
| **12** | **`GalleryThumbnailSwitch`** | Product Detail image preview gallery | Thumbnail click / hover | `200ms` `ease-out` cross-fade | GPU `opacity` cross-fade (`0.7 -> 1.0`) with active border indicator | Instantaneous image source swap | **0 KB** |
| **13** | **`AccordionSmoothExpand`** | FilterSidebar collapsible sections & PDP FAQ tabs | User click on accordion header | `250ms` `cubic-bezier(0.4, 0, 0.2, 1)` | CSS `grid-template-rows: 0fr -> 1fr` with `overflow-hidden` *(Documented as deliberate, isolated user-triggered layout exception)* | Instant visibility toggle | **0 KB** |
| **14** | **`SkeletonShimmer`** | Product card, listing, and page loading skeletons | Continuous during loading state | `1500ms` `ease-in-out` infinite loop | GPU gradient `transform: translateX(-100% -> 100%)` composited layer | Static light-grey background pulse | **0 KB** |
| **15** | **`ToastSlideIn`** | Cart add / Wishlist / Discount code notification toasts | Triggered on event dispatch | `300ms` `cubic-bezier(0.16, 1, 0.3, 1)` enter; `200ms` exit | GPU `transform: translateY(16px -> 0)` and `opacity: 0 -> 1` | Immediate appearance without translation | **0 KB** |

---

## 3. Beyond-the-Brief Feature Proposals (UNAPPROVED — NOT TO BE BUILT)

> [!IMPORTANT]
> The items below are **PROPOSALS ONLY**. They are **NOT APPROVED**, and zero scaffolding or code will be written for them. They will be revisited only after Phase 3 upon user request.

### PROPOSAL A: Quick-View Modal with Micro-Gallery
- **Concept**: Clicking an eye icon or "Quick View" on any product card opens a lightweight modal overlay with high-resolution image preview, quick specs, and immediate "Add to Cart" or "WhatsApp Quote" CTA without leaving the store listing page.
- **Motion**: Backdrop blur fade-in (`200ms`) and modal scale-up from `scale(0.96)` to `scale(1.0)` (`250ms`).
- **Status**: **UNAPPROVED PROPOSAL.**

---

### PROPOSAL B: Sticky "Compare Laptops" Floating Dock
- **Concept**: A bottom floating tray allowing customers to select up to 3 laptops (e.g. ThinkPad vs EliteBook vs Latitude) for a side-by-side spec comparison table.
- **Motion**: Tray slides up from bottom (`300ms`), item chips smoothly animate into dock slots.
- **Status**: **UNAPPROVED PROPOSAL.**

---

### PROPOSAL C: 60-Second Interactive Laptop Finder Wizard
- **Concept**: A 3-step interactive question flow on the homepage ("Who are you buying for?" -> "What is your primary workload?" -> "Target Budget?") that instantly filters and highlights recommended laptops.
- **Motion**: Step-by-step horizontal card slide with progress bar filling.
- **Status**: **UNAPPROVED PROPOSAL.**

---

### PROPOSAL D: Fly-to-Cart Particle Trajectory
- **Concept**: When "Add to Cart" is clicked, a miniaturized thumbnail clone floats along a curved bezier path towards the header cart icon.
- **Motion**: 2-axis curved translation (`450ms`) with scaling down (`1.0 -> 0.2`).
- **Status**: **UNAPPROVED PROPOSAL.**

---

## 4. Research Citations & Source Documentation

1. **Motion (Framer Motion v12) Bundle Cost**:
   - [Motion React Bundle Size Official Documentation](https://motion.dev/docs/react-bundle-size): Initial synchronous entry point for `LazyMotion` is ~4.5 KB, but the asynchronously loaded `domAnimation` feature package adds ~17–20 KB. Full standard `motion` imports exceed 34 KB.
2. **GSAP Licensing & Bundle Cost**:
   - [GreenSock Webflow Licensing Announcement](https://gsap.com/pricing/): GSAP became completely free for commercial and non-commercial use under standard Webflow licensing in 2024/2025.
   - **Reason for rejection**: Minified bundle size of 25–60 KB and lack of native React 19 / Server Component primitives compared to zero-runtime CSS.
3. **Lottie Footprint**:
   - [Lottie-Web Repository & Package Specs](https://github.com/airbnb/lottie-web): `lottie-web` runtime introduces ~60–70 KB gzipped JavaScript overhead plus JSON parse costs.
4. **Google Core Web Vitals INP Thresholds**:
   - [Google Core Web Vitals Interaction to Next Paint (INP) Guide](https://web.dev/articles/inp): Google defines `<= 200ms` as **Good**, `200ms–500ms` as **Needs Improvement**, and `> 500ms` as **Poor**. Our internal engineering target is `<= 100ms`.
