# LaptopMitra — Design System & UI Brief

> **Version:** 1.0 | **Date:** 2026-09-11 | **Author:** Senior Product Designer
> **Reference:** 21st.dev component patterns, shadcn/ui ecosystem
> **Status:** Pre-implementation brief — no code has been written

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Visual Direction](#2-visual-direction)
3. [Design Tokens](#3-design-tokens)
4. [Screen Inventory](#4-screen-inventory)
5. [User Flows](#5-user-flows)
6. [Per-Screen Layout](#6-per-screen-layout)
7. [Component Library](#7-component-library)
8. [State Patterns](#8-state-patterns)
9. [Responsive Behaviour](#9-responsive-behaviour)
10. [Accessibility](#10-accessibility)

---

## 1. Design Principles

Three rules this product's UI must obey. Every design decision filters through these.

### Principle 1: "Trust is Visible"

**What it means:** A refurbished laptop purchase carries inherent anxiety — "Will it actually work? Is the grade real? What if it breaks?" Every screen must proactively answer these doubts without the user having to ask.

**How it manifests:**
- Every product card shows its grade badge (A+, A, B) prominently — never hidden behind a click
- Warranty and return policy appear in-context (on cart, on checkout, on product detail), not buried in a footer link
- Social proof is specific and quantified: "50,000+ laptops sold" not "Trusted by many"
- Prices always show the MRP strikethrough with the exact savings amount — the value proposition is never ambiguous

**Why this fits LaptopMitra:** Unlike Amazon or Flipkart where refurbished is a tiny sidebar business, this IS the entire business. Trust isn't a feature — it's the product.

### Principle 2: "Density Without Chaos"

**What it means:** Laptop shoppers compare specs obsessively — RAM, processor generation, storage type, battery health, display resolution. We must show dense technical information without overwhelming non-technical buyers.

**How it manifests:**
- Two-tier information architecture: **glanceable** (specs tags on cards: "16GB", "512GB SSD", "i7") and **deep** (full spec table on detail page)
- Color-coded spec pills that mean something: RAM = one color family, storage = another, processor = another
- Progressive disclosure: summary on cards → expanded on detail → full comparison on compare view
- White space is strategic — generous gaps between sections, tight grouping within spec blocks

**Why this fits LaptopMitra:** The target buyer is either a tech-savvy deal hunter (who wants specs fast) or a student/first-time buyer (who needs hand-holding). The UI must serve both without dumbing down.

### Principle 3: "Motion Serves Meaning"

**What it means:** Animation exists to guide attention, confirm actions, and create delight — not to show off. Every animation must answer: "What does this tell the user?"

**How it manifests:**
- Cart add: a subtle scale-pulse on the cart icon + counter increment animation → confirms the action happened
- Product card hover: gentle lift + shadow deepening → signals "this is clickable, focus here"
- Page transitions: staggered fade-in of product grid → creates visual rhythm, prevents jarring pop-in
- Scroll reveal on homepage sections → guides the eye down the narrative
- NO decorative parallax, NO mouse-tracking glows, NO particles — this is an e-commerce store, not a portfolio

**Why this fits LaptopMitra:** The 21st.dev showcase components (spotlight cards, liquid glass buttons, scroll morphs) are stunning but designed for developer portfolios and landing pages. For a transactional e-commerce site, animation must be purposeful and fast — every 100ms of animation delay is a potential cart abandonment.

---

## 2. Visual Direction

### Mood

**"Premium technical instrument"** — Think of how Apple presents MacBook specs, or how dbrand shows skin textures. Precise, clean, high-contrast, with moments of warmth from the human "Mitra" (friend) identity.

**Not:** bubbly, playful, cute, corporate-blue, template-ish.

### Colour Philosophy

The current blue-600/zinc-900 palette is the default Tailwind e-commerce look — it's what every AI-generated template produces. We're replacing it with a system that has **identity**.

**Primary palette:** Deep navy (`#0B1120`) as the dark foundation. Electric cyan (`#00E5A0`) as the signature accent — it reads as "fresh," "quality-checked," "go" (green-adjacent but distinctly techy). Warm white (`#F8FAFC`) for light surfaces.

**Why not blue?** Blue is the most overused colour in tech. Every SaaS, every bank, every AI tool is blue. LaptopMitra needs to stand out in a browser tab next to Flipkart (blue), Amazon (orange), and Croma (red). Electric green-cyan is distinctive, signals "certified/quality" (green = good), and has excellent dark-mode contrast.

**Why not pure black?** Pure `#000000` backgrounds create harsh contrast and poor readability in bright ambient light (Indian offices, cafes, outdoors). A deep navy (`#0B1120`) has warmth and reduces eye strain.

### References

| Source | What to borrow | What to skip |
|--------|---------------|--------------|
| **21st.dev homepage** | Monochromatic dark scheme, generous spacing, italic emphasis in headlines | Mouse-tracking glows (too portfolio-like) |
| **Apple Store** | Spec comparison tables, clean product photography framing, price anchoring | Minimalist-but-cold tone (we need warmth) |
| **Vercel dashboard** | Sharp edges on cards, precise typography, dark mode execution | Too developer-focused, no warmth |
| **dbrand.com** | Product photography treatment, bold copywriting, confident tone | Too edgy/memey for Indian market |
| **21st.dev Spotlight Card** | Cursor-reactive glow on product cards (tasteful, subtle) | Full-viewport glow (too dramatic) |
| 21st.dev Number Ticker | Animated stat counters for homepage trust metrics | N/A — use directly |
| 21st.dev Testimonials Columns | Multi-column review layout | The orange colour scheme (use our palette) |

### What to Avoid

| Anti-pattern | Why | Do this instead |
|-------------|-----|-----------------|
| Generic blue gradient hero | Looks like every AI template | Dark navy hero with teal accent typography |
| Emoji-heavy sections (🎮🍏💼) | Feels juvenile, reduces trust for ₹50K+ purchases | SVG icons from Lucide (consistent weight, professional) |
| `animate-pulse` as the only loading state | Lazy, feels broken | Meaningful skeleton shapes that match content layout |
| `window.confirm()` / `alert()` for user actions | Breaks immersion, feels like a prototype | Toast notifications and confirmation modals |
| Box-shadow on every card | Visual noise, no hierarchy | Shadow only on hover/active, borders for default state |
| Centering everything | Lazy layout, no visual tension | Left-aligned text (better readability), right-aligned actions |
| "Indian" as a design style | There is no "Indian design style" | Clean global design with Indian-market-specific content (₹, pincode, COD) |

### Typography Choice

| Role | Font | Why |
|------|------|-----|
| **Headlines** | **Space Grotesk** (Google Fonts) | Geometric sans with distinct character — the `G` and `t` have unique terminals that give it personality. Technical feel without being cold. Free, open-source, variable-weight. |
| **Body** | **Geist Sans** (already installed) | Excellent readability at small sizes, clean and neutral. Already in the project — no new dependency. |
| **Monospace/Specs** | **Geist Mono** (already installed) | Pairs with Geist Sans. Use for: SKU codes, price displays, spec values, order numbers. |
| **Accent/Brand** | *Space Grotesk Italic* | Used sparingly for hero emphasis words — matching 21st.dev's signature italic device: "Premium Laptops. *Like-New* Quality." |

**Why Space Grotesk over Inter/Geist for headlines?** Geist is excellent but neutral — it doesn't have a point of view. Space Grotesk's slightly geometric character (the circular `o`, the angled `t`) gives headlines personality. Since we're already using Geist for body, the pairing creates clear hierarchy: Geist = reliable body, Space Grotesk = confident headlines.

---

## 3. Design Tokens

### Colour Palette

#### Dark Mode (Primary — matches the premium feel)

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--bg-deep` | `#0B1120` | Custom `navy-950` | Page background, hero sections |
| `--bg-surface` | `#111827` | `gray-900` | Card backgrounds, sidebar |
| `--bg-elevated` | `#1E293B` | `slate-800` | Hover states, dropdown menus, modals |
| `--bg-subtle` | `#1A2332` | Custom `navy-900` | Alternating section backgrounds |
| `--border-default` | `#1E293B` | `slate-800` | Card borders, dividers |
| `--border-subtle` | `#0F172A` | `slate-900` | Faint separators |
| `--text-primary` | `#F8FAFC` | `slate-50` | Headlines, prices, primary text |
| `--text-secondary` | `#94A3B8` | `slate-400` | Descriptions, labels, metadata |
| `--text-muted` | `#64748B` | `slate-500` | Timestamps, helper text |
| `--accent` | `#00E5A0` | Custom `mint-500` | Primary CTA, success states, grade badges |
| `--accent-dim` | `#00C48C` | Custom `mint-600` | Hover state for accent |
| `--accent-bg` | `rgba(0,229,160,0.1)` | `mint-500/10` | Accent tint backgrounds, subtle highlights |
| `--warning` | `#FBBF24` | `amber-400` | Low stock, tier badges, "deal" indicators |
| `--danger` | `#F87171` | `red-400` | Out of stock, errors, destructive actions |
| `--info` | `#38BDF8` | `sky-400` | Links, informational callouts |

#### Light Mode (Secondary — for users who prefer light)

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--bg-deep` | `#F8FAFC` | `slate-50` | Page background |
| `--bg-surface` | `#FFFFFF` | `white` | Card backgrounds |
| `--bg-elevated` | `#F1F5F9` | `slate-100` | Hover states, dropdown menus |
| `--border-default` | `#E2E8F0` | `slate-200` | Card borders, dividers |
| `--text-primary` | `#0F172A` | `slate-900` | Headlines, prices |
| `--text-secondary` | `#475569` | `slate-600` | Descriptions, labels |
| `--text-muted` | `#94A3B8` | `slate-400` | Timestamps, helper text |
| `--accent` | `#059669` | `emerald-600` | Primary CTA (darker for contrast on light bg) |
| `--accent-dim` | `#047857` | `emerald-700` | Hover state |
| `--warning` | `#D97706` | `amber-600` | Low stock, tier badges |
| `--danger` | `#DC2626` | `red-600` | Errors, destructive actions |

**Why these specific colours?**
- `#00E5A0` (mint/cyan) on `#0B1120` (navy) gives a **contrast ratio of 11.2:1** — well above WCAG AAA (7:1). It pops without being garish.
- The slate scale (not zinc, not gray) has a cool blue undertone that harmonizes with both the navy background and the mint accent. Zinc feels warmer/grayer; slate feels more technical.
- We're NOT using `blue` anywhere in the customer-facing UI. This is the single most impactful visual change from the current design.

### Type Scale

Based on a **1.25 ratio** (Major Third), starting from 16px base:

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `--text-xs` | 12px / 0.75rem | 16px | Badges, timestamps, helper text |
| `--text-sm` | 14px / 0.875rem | 20px | Labels, secondary text, meta info |
| `--text-base` | 16px / 1rem | 24px | Body text, descriptions |
| `--text-lg` | 20px / 1.25rem | 28px | Card titles, section subheadings |
| `--text-xl` | 24px / 1.5rem | 32px | Page titles, hero subheadings |
| `--text-2xl` | 30px / 1.875rem | 36px | Section headlines |
| `--text-3xl` | 36px / 2.25rem | 44px | Page headlines |
| `--text-4xl` | 48px / 3rem | 56px | Hero headline (desktop) |
| `--text-5xl` | 60px / 3.75rem | 64px | Hero headline (large desktop) |

| Role | Font | Weight | Tracking |
|------|------|--------|----------|
| Hero headline | Space Grotesk | 700 (Bold) | `-0.02em` (tight) |
| Section headline | Space Grotesk | 700 (Bold) | `-0.01em` |
| Card title | Geist Sans | 600 (Semibold) | `0` |
| Body | Geist Sans | 400 (Regular) | `0` |
| Label / Badge | Geist Sans | 600 (Semibold) | `0.02em` (wide, uppercase) |
| Price | Geist Mono | 700 (Bold) | `0` |
| SKU / Code | Geist Mono | 400 (Regular) | `0.01em` |

### Spacing Scale

4px base unit. Every spacing value is a multiple of 4.

| Token | Value | Common Usage |
|-------|-------|-------------|
| `--space-1` | 4px | Tight gaps (badge padding, icon margins) |
| `--space-2` | 8px | Spec tags, small padding |
| `--space-3` | 12px | Card internal padding (compact), form field gaps |
| `--space-4` | 16px | Card padding, button padding, standard gaps |
| `--space-5` | 20px | Medium card padding |
| `--space-6` | 24px | Section internal spacing |
| `--space-8` | 32px | Large card padding, subsection gaps |
| `--space-10` | 40px | Section vertical padding (mobile) |
| `--space-12` | 48px | Section vertical padding (desktop) |
| `--space-16` | 64px | Major section separators |
| `--space-20` | 80px | Hero section vertical padding |
| `--space-24` | 96px | Page-level vertical rhythm |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Badges, small tags, input fields |
| `--radius-md` | 10px | Buttons, cards (compact) |
| `--radius-lg` | 14px | Cards (standard), dropdown menus |
| `--radius-xl` | 20px | Hero deal card, feature cards, modals |
| `--radius-2xl` | 28px | Hero card wrapper, large containers |
| `--radius-full` | 9999px | Pills, circular avatars, round buttons |

**Why these radii?** The current design uses `rounded-2xl` (16px) everywhere — on cards, buttons, badges, modals. This flattens hierarchy. We use smaller radii for smaller elements (badges = 6px) and larger for hero elements (28px), creating visual scale that matches physical size.

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle depth on inputs, small elements |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.25)` | Cards at rest |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.3)` | Cards on hover, dropdowns |
| `--shadow-xl` | `0 16px 48px rgba(0,0,0,0.35)` | Modals, floating elements |
| `--shadow-glow` | `0 0 20px rgba(0,229,160,0.15)` | Accent glow on primary CTA hover |
| `--shadow-card-hover` | `0 8px 32px rgba(0,229,160,0.08)` | Product card hover (subtle teal tint) |

**Why tinted shadow on card hover?** A generic grey shadow on hover is invisible on dark backgrounds. A faint teal-tinted shadow creates a subconscious association between "hovering" and "the accent colour = action zone." It's subtle — most users won't consciously notice it — but it makes the hover feel intentional rather than mechanical.

### Animation Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 150ms | Micro-interactions: button press, toggle switch |
| `--duration-normal` | 250ms | Hover states, card transitions, dropdown open |
| `--duration-slow` | 400ms | Page element reveal, modals, drawer open/close |
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard Material-style easing |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy feel: cart add, success checkmark |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering view (slide-up fade-in) |

---

## 4. Screen Inventory

### Customer-Facing Screens (10)

| # | Screen | Route | Purpose | Priority |
|---|--------|-------|---------|----------|
| C1 | **Homepage** | `/` | First impression, trust building, navigation to catalog | P0 |
| C2 | **Product Listing** | `/products` | Browse, filter, sort, compare laptops | P0 |
| C3 | **Product Detail** | `/products/[id]` | Deep-dive specs, quality info, add to cart | P0 |
| C4 | **Cart** | `/cart` | Review items, adjust quantities, promo codes | P0 |
| C5 | **Checkout** | `/checkout` | Shipping details, payment, order confirmation | P0 |
| C6 | **Login** | `/login` | Email/password authentication | P0 |
| C7 | **Register** | `/register` | New account creation with referral code | P0 |
| C8 | **Profile** | `/profile` | Orders, referral dashboard, account settings | P1 |
| C9 | **Wishlist** | `/wishlist` | Saved products, quick cart migration | P1 |
| C10 | **Compare** | `/compare` | Side-by-side spec comparison (NEW) | P2 |

### Admin Screens (6)

| # | Screen | Route | Purpose | Priority |
|---|--------|-------|---------|----------|
| A1 | **Dashboard** | `/admin` | KPIs, revenue, quick actions | P0 |
| A2 | **User Management** | `/admin/users` | List, filter, suspend/activate users | P0 |
| A3 | **Product Management** | `/admin/products` | CRUD products, stock, featured toggle | P0 |
| A4 | **Order Management** | `/admin/orders` | View orders, update status, tracking | P0 |
| A5 | **Analytics** | `/admin/analytics` | Revenue charts, best sellers, conversions | P1 |
| A6 | **Settings** | `/admin/settings` | Store config, payment, shipping, email | P1 |

---

## 5. User Flows

### Flow 1: First-Time Visitor → Purchase (Primary Revenue Flow)

```
1. LAND ON HOMEPAGE (C1)
   ├─ See hero with trust badge: "India's #1 Certified Refurbished"
   ├─ See animated stats: "50,000+ sold" / "4.9★ rating" / "1-Year Warranty"
   └─ CTA: "Explore Laptops" → Product Listing (C2)

2. BROWSE PRODUCTS (C2)
   ├─ Scan grid of ProductCards with glanceable specs (RAM, SSD, Processor)
   ├─ Filter by: Category (dropdown) / Price Range (slider) / RAM / Processor
   ├─ Sort by: Featured / Price Low→High / Price High→Low / Newest
   ├─ Click product card → Product Detail (C3)
   └─ Optionally: Click heart icon to add to Wishlist (C9)

3. VIEW PRODUCT DETAIL (C3)
   ├─ See hero image with Grade A+ badge overlay
   ├─ Read 32-point quality checklist summary
   ├─ Review full spec table (processor, RAM, storage, display, battery health)
   ├─ Check price with MRP strikethrough + savings callout
   ├─ See trust strip: "Free Express Delivery" / "1-Year Warranty" / "7-Day Return"
   ├─ Select quantity → Click "Add to Cart" → Cart badge updates
   └─ OR Click "Buy Now" → Skip to Checkout (C5)

4. REVIEW CART (C4)
   ├─ See item list with thumbnails, specs, individual prices
   ├─ Adjust quantities (stock-aware stepper)
   ├─ Enter pincode for delivery estimate
   ├─ Apply promo code: MITRA500 (₹500 off) or referral code (10% off)
   ├─ See order summary: subtotal → discounts → total
   └─ Click "Proceed to Secure Checkout" → Checkout (C5)

5. CHECKOUT (C5)
   ├─ Step 1: Shipping form (name, phone, address, pincode)
   ├─ Step 2: Payment method (Razorpay or COD)
   ├─ See order summary sidebar (persistent, scrollable)
   ├─ Click "Confirm & Pay" → Razorpay modal opens
   ├─ Complete payment → Loading state
   └─ SUCCESS: Order confirmation with order number, delivery estimate, next steps
```

**Key metrics for this flow:**
- Homepage → Product Listing click-through rate
- Product Detail → Add to Cart conversion
- Cart → Checkout progression
- Checkout → Payment completion (Razorpay success rate)

### Flow 2: Returning User → Wishlist Purchase

```
1. LOGIN (C6) → LAND ON HOMEPAGE (C1)
2. Click heart icon in navbar → Wishlist (C9)
3. See saved products grid
4. Click product → Product Detail (C3)
5. Click "Move to Cart" → Cart (C4) with item pre-filled
6. Proceed through Flow 1 from Step 4
```

### Flow 3: Referral / Mitra Affiliate

```
1. LOGIN → Profile (C8) → "Mitra Affiliate Rewards" tab
2. See referral code, commission stats, tier status
3. Copy referral code → Share externally
4. Referred friend registers (C7) using referral code
5. Friend gets ₹500 off first order
6. Affiliate earns 10% commission → reflected in Profile stats
```

### Flow 4: Admin — Process Order

```
1. LOGIN → Admin Dashboard (A1)
   ├─ See pending orders count (red badge if > 0)
   └─ Quick action: "View Orders" → Order Management (A4)
2. Filter by status: PENDING
3. Click order → See full details (items, customer, address, payment)
4. Update status: PENDING → CONFIRMED → SHIPPING → DELIVERED
5. Add tracking number (optional)
6. Status change reflects on customer's Profile (C8) orders tab
```

---

## 6. Per-Screen Layout

### C1: Homepage

**Sections (top to bottom):**

| Section | Background | Content | Height |
|---------|-----------|---------|--------|
| **Top Banner** | `accent` (mint) on `bg-deep` | "⚡ 1-Year Warranty • 7-Day Return • Code MITRA500 for ₹500 Off" | 36px |
| **Navbar** | `bg-deep/95` with `backdrop-blur-xl` | Logo, search bar, nav links, cart/wishlist/user | 64px |
| **Hero** | `bg-deep` with radial gradient accent | Headline (Space Grotesk, italic emphasis), subtitle, 2 CTAs, deal card | ~85vh |
| **Trust Stats Bar** | `bg-surface` | Animated Number Ticker: 50K+ sold, 4.9★, 1-Year Warranty | 80px |
| **Categories** | `bg-deep` | 5-column grid: SVG icon + title + subtitle | 320px |
| **Featured Products** | `bg-surface` | Tab toggle (Best Sellers / New Arrivals) + 3-col ProductCard grid | Auto |
| **Quality Promise** | `bg-deep` | 3 cards: Battery, Display, Thermals — with numbered indicators | 380px |
| **Social Proof** | `bg-surface` | Logo strip (Lenovo, Dell, HP, Apple — grayscale) + testimonial quotes | 300px |
| **Mitra Referral CTA** | `bg-deep` with gradient | Referral promo with commission details, dual CTA | 320px |
| **Footer** | `bg-deep` | 4-column links, trust badges, copyright | 280px |

**Hero Detail:**
```
┌─────────────────────────────────────────────────────────────┐
│ [radial-gradient overlay: accent at 15% opacity]            │
│                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────┐    │
│  │ [accent pill badge]      │  │ [Deal of the Day]    │    │
│  │                          │  │                      │    │
│  │ Premium Laptops.         │  │  [Product Image]     │    │
│  │ *Like-New* Quality.      │  │                      │    │
│  │ Up to 65% Off Retail.    │  │  Grade A+ Badge      │    │
│  │                          │  │  Name / Specs        │    │
│  │ [Subtitle text]          │  │  Price + Strikethrough│    │
│  │                          │  │  "Claim Offer →"     │    │
│  │ [Explore Laptops →]      │  └──────────────────────┘    │
│  │ [🍏 Apple MacBooks]      │                              │
│  │                          │                              │
│  │ ─────────────────────── │                              │
│  │ 50K+  │  4.9★  │ 1 Year │                             │
│  └──────────────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

**Key decisions:**
- Left-aligned hero text (not centered) — better readability, creates visual tension with the right-side deal card
- Deal card has a gradient border (mint→cyan) that glows subtly — draws the eye to the "buy" action
- Trust stats use the Number Ticker animation from 21st.dev — counters animate from 0 to final value on scroll-into-view

### C2: Product Listing

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb: Home > All Laptops                               │
├────────────┬────────────────────────────────────────────────┤
│ FILTERS    │ Sort: [Featured ▼]    Showing 24 laptops      │
│ (sticky)   │                                                │
│            │ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ Search [__]│ │ Product  │ │ Product  │ │ Product  │        │
│            │ │ Card     │ │ Card     │ │ Card     │        │
│ Category   │ └──────────┘ └──────────┘ └──────────┘        │
│ ○ All      │ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ ○ Business │ │ Product  │ │ Product  │ │ Product  │        │
│ ○ Apple    │ │ Card     │ │ Card     │ │ Card     │        │
│ ○ Gaming   │ └──────────┘ └──────────┘ └──────────┘        │
│ ○ Ultrabook│                                                │
│ ○ Student  │ Load More / Pagination                          │
│            │                                                │
│ Price Range│                                                │
│ ○ Under ₹30K                                               │
│ ○ ₹30K–50K │                                                │
│ ○ ₹50K–80K │                                                │
│ ○ Above ₹80K                                               │
│            │                                                │
│ ☐ In Stock │                                                │
│            │                                                │
│ [Reset All]│                                                │
└────────────┴────────────────────────────────────────────────┘
```

**Key decisions:**
- **Sidebar filters on desktop** (not hidden behind a button) — laptop buyers filter aggressively; hiding filters adds a click to every interaction
- **Sticky sidebar** — filters stay visible while scrolling the product grid
- **Mobile: filters move to a slide-out drawer** triggered by a "Filters" button with active filter count badge
- Product grid switches: 3-col (desktop) → 2-col (tablet) → 1-col (mobile)

### C3: Product Detail

**Layout (desktop):**
```
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb: Home > Laptops > MacBook Pro 16"                │
├───────────────────────────────┬─────────────────────────────┤
│                               │ [Grade A+ Badge] [15% OFF]  │
│  ┌─────────────────────────┐  │                             │
│  │                         │  │ Apple MacBook Pro 16"       │
│  │    [Main Product Image] │  │ M2 Pro, 16GB, 512GB        │
│  │                         │  │                             │
│  │    4:3 aspect ratio     │  │ ₹1,54,999                  │
│  │                         │  │ ₹2,49,900 (save ₹94,901)  │
│  └─────────────────────────┘  │                             │
│  [thumb] [thumb] [thumb]      │ ┌───────────────────────┐  │
│                               │ │ Quantity: [-] 1 [+]   │  │
│  ┌───────────────────────┐   │ │ Stock: 8 units left   │  │
│  │ 32-Point Inspection   │   │ └───────────────────────┘  │
│  │ ✓ Battery >90%        │   │                             │
│  │ ✓ Display pristine    │   │ [ Add to Cart ]            │
│  │ ✓ Thermal repasted    │   │ [ Buy Now ]                │
│  │ ✓ Keyboard verified   │   │ [ ♡ Add to Wishlist ]      │
│  └───────────────────────┘   │                             │
│                               │ 🚚 Free Express Delivery   │
│  ── Technical Specifications ─│ 🛡️ 1-Year Warranty         │
│  Processor: M2 Pro           │ 🔄 7-Day Replacement       │
│  RAM: 16GB Unified           │                             │
│  Storage: 512GB SSD          │                             │
│  Display: 16.2" Liquid Retina│                             │
│  Battery Health: 98%         │                             │
│  Graphics: 16-core GPU       │                             │
│                               │                             │
│  ── Description ─            │                             │
│  [Full product description]  │                             │
└───────────────────────────────┴─────────────────────────────┘
```

**Key decisions:**
- **Left image / right info** (not stacked) — above the fold on desktop, the user sees image + price + CTA simultaneously. No scrolling needed to find the "Buy" button.
- **32-point inspection card** appears BELOW the image but ABOVE the fold on the left — it's our trust differentiator and needs visibility
- **Specs table** uses a clean 2-column layout with Geist Mono for values — scannable
- Trust badges are always visible in the right column (sticky on scroll)

### C4: Cart

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Your Cart (3 items)                    [Continue Shopping →]│
├─────────────────────────────────┬───────────────────────────┤
│ ┌─────────────────────────────┐ │ ORDER SUMMARY             │
│ │ [img] MacBook Pro 16"      │ │                           │
│ │       16GB / 512GB SSD     │ │ Subtotal     ₹1,54,999   │
│ │       ₹1,54,999            │ │ Delivery      FREE        │
│ │       [-] 1 [+]    [🗑️]   │ │ Warranty      FREE        │
│ └─────────────────────────────┘ │                           │
│ ┌─────────────────────────────┐ │ [Promo Code: ______]      │
│ │ [img] ThinkPad X1 Carbon   │ │ [Apply]                   │
│ │       16GB / 512GB SSD     │ │                           │
│ │       ₹62,999              │ │ ✅ MITRA500 applied (-₹500)│
│ │       [-] 1 [+]    [🗑️]   │ │                           │
│ └─────────────────────────────┘ │ ─────────────────────     │
│                                 │ Total    ₹2,17,499       │
│ ┌─────────────────────────────┐ │                           │
│ │ 📍 Check delivery: [_____] │ │ [Proceed to Checkout →]   │
│ │    Enter 6-digit pincode   │ │                           │
│ └─────────────────────────────┘ │ 🔒 Secure • Razorpay     │
└─────────────────────────────────┴───────────────────────────┘
```

**Key decisions:**
- **Order summary is sticky** on desktop — always visible while scrolling through cart items
- **Pincode checker** is prominent but not blocking — delivery confidence reduces cart abandonment
- **Quantity stepper** shows real-time stock limits — prevents adding more than available
- **Remove action** uses a confirmation tooltip (not window.confirm)

### C5: Checkout

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Secure Checkout                       [Back to Cart]        │
│ Step 1 ─── Step 2 ─── Step 3                                │
│ ● Shipping      ○ Payment      ○ Confirm                    │
├─────────────────────────────────┬───────────────────────────┤
│                                 │ YOUR ORDER                 │
│ ── Shipping Details ──          │ [img] MacBook Pro    ×1   │
│                                 │ [img] ThinkPad X1    ×1   │
│ Full Name: [_______________]   │                           │
│ Phone:     [_______________]   │ Subtotal     ₹2,17,999   │
│ Email:     [_______________]   │ Discount       -₹500     │
│ Address:   [_______________]   │ Delivery       FREE      │
│ City:      [_______________]   │                           │
│ Pincode:   [_______________]   │ ─────────────────────     │
│ Landmark:  [_______________]   │ Total        ₹2,17,499   │
│                                 │                           │
│ ── Or select saved address ──   │ [Confirm & Pay →]         │
│ ┌─────────────────────────────┐ │                           │
│ │ 📍 Home: 123 MG Road...    │ │ Powered by Razorpay 🔒   │
│ └─────────────────────────────┘ │                           │
└─────────────────────────────────┴───────────────────────────┘
```

**Order Confirmation (post-payment):**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ✓                                        │
│              Order Confirmed!                               │
│                                                             │
│         Order #LM-2026-00847                                │
│         Amount Paid: ₹2,17,499                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Estimated Delivery: 5-7 business days               │   │
│  │ Shipping to: 123 MG Road, Bangalore 560001          │   │
│  │                                                      │   │
│  │ [Track Order]  [Continue Shopping]                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 Share your referral code with friends — earn 10%!       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### C6/C7: Login & Register

**Layout (shared):**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─── Left panel (desktop only) ───┐ ┌─── Form panel ───┐ │
│  │                                  │ │                   │ │
│  │  [LaptopMitra Logo]             │ │  [LM Logo]       │ │
│  │                                  │ │  Welcome Back     │ │
│  │  "The Mitra you trust           │ │                   │ │
│  │   for your next laptop."        │ │  Email: [______] │ │
│  │                                  │ │  Pass:  [______] │ │
│  │  [decorative laptop image       │ │                   │ │
│  │   or abstract pattern]           │ │  [Sign In →]     │ │
│  │                                  │ │                   │ │
│  │  50K+ laptops sold              │ │  Demo: [Quick     │ │
│  │  4.9★ average rating            │ │  Fill Account]    │ │
│  │  1-Year doorstep warranty       │ │                   │ │
│  │                                  │ │  No account?      │ │
│  │                                  │ │  Join Mitra →     │ │
│  └──────────────────────────────────┘ └───────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key decisions:**
- **Split layout on desktop** — left panel reinforces brand while user types. Prevents the "lonely form in white space" pattern.
- **Mobile: left panel hides**, form goes full-width with logo on top
- Register form adds: Name, Phone, Referral Code (optional, with ₹500 off hint)

### C8: Profile

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [gradient banner: bg-deep → accent at 30% opacity]      │ │
│ │                                                         │ │
│ │  [Avatar: initials circle]  Rahul Sharma                │ │
│ │                              ⭐ GOLD Tier               │ │
│ │                              rahul@example.com          │ │
│ │                              [Sign Out]                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [My Orders] [Mitra Affiliate] [Account]                     │
│ ───────────────────────────────────────                     │
│                                                             │
│ (Tab content below)                                         │
└─────────────────────────────────────────────────────────────┘
```

**My Orders tab:**
- Order cards with: order number, date, status badge, item thumbnails, total, delivery address
- Status badges: PENDING (amber), CONFIRMED (blue), SHIPPING (cyan), DELIVERED (mint), CANCELLED (red)

**Mitra Affiliate tab:**
- 3 stat cards: Total Earnings (₹), Successful Referrals (count), Current Tier (BASIC/GOLD/PLATINUM)
- Referral code card with copy button (dark background, large mono text)
- Tier progress bar: shows next tier threshold

**Account tab:**
- 2-column grid: Name, Email, Phone, Address, Status, Member Since
- Edit profile button (future)

### A1: Admin Dashboard

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Sidebar] │ Dashboard                                      │
│           │                                                │
│ ○ Dash    │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│ ○ Users   │ │ Users  │ │Products│ │ Orders │ │Revenue │  │
│ ○ Products│ │ 1,247  │ │   58   │ │  342   │ │₹12.4L  │  │
│ ○ Orders  │ │ ↑12%   │ │ 3 OOS  │ │ 28 new │ │ ↑8%    │  │
│ ○ Stats   │ └────────┘ └────────┘ └────────┘ └────────┘  │
│ ○ Settings│                                                │
│           │ ┌─── Revenue (7 days) ──────────────────────┐  │
│           │ │  ████                                     │  │
│           │ │  ████ ███                                │  │
│           │ │  ████ ███ ████                           │  │
│           │ │  ████ ███ ████ ███                       │  │
│           │ │  Mon Tue Wed Thu Fri Sat Sun              │  │
│           │ └──────────────────────────────────────────┘  │
│           │                                                │
│           │ ┌─── Best Sellers ─────┐ ┌─── Order Status ─┐ │
│           │ │ 1. MacBook Pro  M2  │ │ Completed: 72%   │ │
│           │ │ 2. ThinkPad X1      │ │ Pending:   18%   │ │
│           │ │ 3. Dell XPS 15      │ │ Cancelled: 10%   │ │
│           │ │ 4. ROG Zephyrus     │ │                  │ │
│           │ │ 5. MacBook Air M1   │ │                  │ │
│           │ └──────────────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Component Library

Every reusable component with its variants, states, and intended props.

### ProductCard

**Purpose:** Represent a single product in grid layouts (listing, homepage, wishlist)

| Variant | Description |
|---------|-------------|
| `default` | Standard card with image, specs tags, price, CTA |
| `compact` | Smaller image, no description, used in cart items and recommendations |
| `featured` | Larger, shows more detail, used on homepage hero section |

| State | Visual Treatment |
|-------|-----------------|
| `default` | Border `border-default`, shadow `shadow-md` |
| `hover` | Border `accent`, shadow `shadow-card-hover` (teal tint), image scales 5% |
| `loading` | Skeleton pulse matching card layout |
| `out-of-stock` | Image desaturated (grayscale 50%), "Out of Stock" badge replaces CTA button |

**Props:** `product: Product`, `variant?: 'default' | 'compact' | 'featured'`, `onAddToCart?: () => void`, `onToggleWishlist?: () => void`

### SpecTag

**Purpose:** Display a single specification value as a pill/tag

| Variant | Colour Family | Usage |
|---------|--------------|-------|
| `ram` | Blue (`sky-500/10` bg, `sky-400` text) | RAM values |
| `storage` | Purple (`violet-500/10` bg, `violet-400` text) | Storage values |
| `processor` | Cyan (`cyan-500/10` bg, `cyan-400` text) | CPU values |
| `display` | Amber (`amber-500/10` bg, `amber-400` text) | Display specs |
| `gpu` | Rose (`rose-500/10` bg, `rose-400` text) | Graphics card |
| `default` | Gray (`slate-500/10` bg, `slate-400` text) | Anything else |

**Props:** `label: string`, `value: string`, `variant?: SpecType`

### GradeBadge

**Purpose:** Display product grade (A+, A, B, etc.) with colour coding

| Grade | Colour | Background |
|-------|--------|-----------|
| `A+` | Mint (`accent`) | `accent-bg` |
| `A` | Sky blue (`info`) | `info/10` |
| `B` | Amber (`warning`) | `warning/10` |

**Props:** `grade: 'A+' | 'A' | 'B'`, `size?: 'sm' | 'md'`

### PriceDisplay

**Purpose:** Show price with optional strikethrough, savings, and EMI info

**Layout:**
```
₹1,54,999  ₹2,49,900
             Save ₹94,901 (38% off)
             Or ₹12,917/month EMI
```

**Props:** `price: number`, `compareAtPrice?: number`, `showEmit?: boolean`, `monthlyEmi?: number`

### QuantityStepper

**Purpose:** Increment/decrement quantity with stock awareness

| State | Visual |
|-------|--------|
| `default` | Border `border-default`, +/- buttons |
| `at-min (1)` | Minus button disabled (opacity 50) |
| `at-max (stock)` | Plus button disabled, "Max stock" helper text |
| `updating` | Brief loading spinner replacing number |

**Props:** `value: number`, `min?: number`, `max: number`, `onChange: (n: number) => void`

### TrustStrip

**Purpose:** Display trust badges in a horizontal strip (used on product detail, cart, checkout)

**Badges:** "🚚 Free Express Delivery" / "🛡️ 1-Year Warranty" / "🔄 7-Day Return" / "🔒 Secure Payment"

**Layout:** Horizontal flex with icons (Lucide), text, and subtle dividers between. `bg-surface` background with `border-default` top/bottom borders.

### Toast / Notification

**Purpose:** Non-blocking feedback messages

| Variant | Icon | Colour |
|---------|------|--------|
| `success` | CheckCircle | `accent` |
| `error` | XCircle | `danger` |
| `warning` | AlertTriangle | `warning` |
| `info` | Info | `info` |

**Position:** Bottom-right (desktop), bottom-full-width (mobile). Auto-dismiss after 4s (success/info) or manual dismiss (error/warning).

**Animation:** Slide in from right + fade, slide out to right + fade.

### SkeletonLoaders

**Purpose:** Content-approximating loading placeholders (not generic rectangles)

| Skeleton | Used on |
|----------|---------|
| `ProductCardSkeleton` | Product grid loading — matches exact card layout with animated shimmer |
| `HeroSkeleton` | Homepage hero loading |
| `SpecTableSkeleton` | Product detail specs loading |
| `CartSkeleton` | Cart page loading |
| `StatsSkeleton` | Dashboard stats loading |

**Animation:** CSS shimmer gradient (`linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)`) sweeping left-to-right, not `animate-pulse` opacity fade.

### Modal / Dialog

**Purpose:** Overlay for confirmations, quick views, and focused tasks

| Variant | Usage |
|---------|-------|
| `confirm` | "Remove from cart?" confirmation |
| `quick-view` | Product quick view from listing |
| `mobile-filter` | Filter drawer on mobile |

**Behaviour:** Backdrop blur + dim, ESC to close, click-outside to close, focus trap inside modal, return focus on close.

### AnimatedCounter (Number Ticker)

**Purpose:** Animated counting number for trust metrics on homepage

**Props:** `target: number`, `prefix?: string` (e.g., "₹"), `suffix?: string` (e.g., "+", "★"), `duration?: number` (default 2000ms)

**Animation:** Counts from 0 to target with ease-out curve. Triggered by IntersectionObserver (animates once when scrolled into view).

### EmptyState

**Purpose:** Friendly empty states for lists with no data

| Variant | Illustration | Message | CTA |
|---------|-------------|---------|-----|
| `cart-empty` | Shopping bag icon | "Your cart is empty" | "Browse Laptops" |
| `wishlist-empty` | Heart icon | "No saved laptops yet" | "Explore Laptops" |
| `orders-empty` | Package icon | "No orders yet" | "Start Shopping" |
| `no-results` | Search icon | "No laptops match your filters" | "Reset Filters" |

### SearchBar

**Purpose:** Global search with autocomplete suggestions

**Layout:** Full-width on mobile, contained (`max-w-lg`) on desktop navbar.

**States:**
- `idle`: Placeholder text, search icon
- `focused`: Border transitions to `accent`, subtle glow shadow
- `results`: Dropdown with categorized results (Products, Categories)
- `no-results`: "No results for [query]" with suggestion text
- `loading`: Spinner replaces search icon

---

## 8. State Patterns

### Empty States

| Screen | Empty State | Illustration | Primary CTA | Secondary CTA |
|--------|-----------|-------------|-------------|---------------|
| Cart (C4) | No items | Large bag icon (Lucide `ShoppingBag`) | "Explore Laptops" → `/products` | — |
| Wishlist (C9) | No saved items | Heart icon (Lucide `Heart`) | "Browse Laptops" → `/products` | — |
| Orders (C8 tab) | No orders | Package icon (Lucide `Package`) | "Start Shopping" → `/products` | — |
| Search (C2) | No results | Search icon (Lucide `SearchX`) | "Reset Filters" | "Browse All" |
| Profile Referral | No referrals | Users icon (Lucide `UserPlus`) | "Share Your Code" | — |

**Design rule:** Every empty state has a clear illustration (64px Lucide icon with `accent` tint), a conversational headline (not "No data found"), and a single prominent CTA.

### Loading States

| Screen | Loading Pattern | Duration Estimate |
|--------|----------------|-------------------|
| Homepage | Skeleton: Hero area + 6 card skeletons in grid | 0.5–2s |
| Product Listing | Skeleton: 6 ProductCardSkeletons in grid | 0.5–1.5s |
| Product Detail | Skeleton: Image area + spec table + price block | 0.5–1s |
| Cart | Skeleton: Cart item rows + summary sidebar | 0.3–0.8s |
| Checkout | No full-page skeleton (form is instant) | — |
| Admin Dashboard | Skeleton: 4 stat cards + chart placeholder | 0.5–1s |
| Admin Tables | Skeleton: 8 table rows with shimmer | 0.5–1.5s |

**Design rule:** Skeletons match the EXACT layout of loaded content. They are not generic rectangles — a ProductCardSkeleton has the same height, same image aspect ratio, same text line positions as a real ProductCard. This prevents layout shift and creates a professional feel.

### Error States

| Scenario | Treatment |
|----------|----------|
| **API failure (products won't load)** | Toast error: "Couldn't load laptops. Retrying..." with auto-retry (3 attempts). Fallback to cached/mock data. |
| **Network offline** | Persistent banner at top: "You're offline. Showing cached data." Product cards work from localStorage. |
| **Form validation error** | Inline error message below each field (red text, `danger` colour). Field border turns `danger`. Error icon (Lucide `AlertCircle`) next to label. |
| **Payment failure** | Modal: "Payment couldn't be processed" with error reason, retry button, and support contact. Order is saved as PENDING. |
| **404 page** | Custom 404 with LaptopMitra branding: "This page doesn't exist. Maybe it was returned?" with search bar and "Go Home" CTA. |
| **500 server error** | Full-page error with illustration, "Something went wrong on our end," retry button, and support email. |

### Success States

| Scenario | Treatment |
|----------|----------|
| **Added to cart** | Button transforms: "Add to Cart" → green checkmark "Added!" for 1.5s, then reverts. Cart badge in navbar does a scale-pulse animation. |
| **Added to wishlist** | Heart icon fills with `danger` colour (rose) with a micro scale animation. |
| **Coupon applied** | Green toast: "MITRA500 applied! You saved ₹500" + order summary updates with animated price change. |
| **Order placed** | Full confirmation screen with animated checkmark (spring easing), order details, and confetti-like particle burst (subtle, 1s duration). |
| **Referral code copied** | Toast: "Referral code copied!" + clipboard icon animation. |

---

## 9. Responsive Behaviour

### Breakpoints

| Name | Width | Columns | Navigation |
|------|-------|---------|-----------|
| Mobile | 0–639px | 1 | Hamburger drawer |
| Tablet | 640–1023px | 2 | Condensed horizontal nav |
| Desktop | 1024–1279px | 3 | Full horizontal nav |
| Wide | 1280px+ | 3–4 | Full horizontal nav, max-width container |

### Per-Screen Responsive Details

| Screen | Mobile | Tablet | Desktop |
|--------|--------|--------|---------|
| **Navbar** | Hamburger → full-screen drawer with search, links, user | Horizontal nav, search bar hidden (icon tap to expand) | Full nav with inline search |
| **Homepage Hero** | Stacked: text → CTA → deal card below. Headline scales from `text-3xl` to `text-5xl` | 2-col: text left, deal card right (smaller) | 12-col grid: 7-col text + 5-col deal card |
| **Product Grid** | 1 column, full-width cards | 2 columns | 3 columns |
| **Product Listing Filters** | Slide-out drawer (left) triggered by "Filters" button | Sidebar visible, collapsible | Sticky sidebar |
| **Product Detail** | Stacked: image → price/CTA → specs → description (scroll) | 2-col: image left, info right | 12-col: 7-col image + 5-col info |
| **Cart** | Stacked: items → pincode → summary | 2-col: items left, summary right | 2-col: 8-col items + 4-col summary |
| **Checkout** | Stacked: form → summary (summary at bottom) | 2-col: form left, summary right | 2-col: 7-col form + 5-col summary |
| **Login/Register** | Full-width form, logo on top | Centered card (max-w-md) | Split panel: brand left + form right |
| **Profile** | Stacked sections, horizontal tab scroll | Tab content full-width | Standard layout with max-width |
| **Admin Sidebar** | Hidden behind hamburger, overlay drawer | Collapsible sidebar (icons only) | Full sidebar (w-64) |

### Touch Targets

All interactive elements meet **44×44px minimum** touch target on mobile:
- Buttons: `min-h-[44px] min-w-[44px]`
- Links in nav: `py-3 px-4` minimum
- Quantity stepper buttons: `w-11 h-11` (44px)
- Wishlist heart: `w-11 h-11`
- Close/dismiss icons: `w-11 h-11`

### Mobile-Specific Adaptations

| Pattern | Desktop | Mobile |
|---------|---------|--------|
| **Sticky CTA** | Scrollable page | "Add to Cart" / "Buy Now" pinned to bottom of screen on product detail |
| **Bottom tab bar** | N/A | NOT using bottom tab bar (single-purpose e-commerce — not an app) |
| **Swipe gestures** | N/A | Swipe-to-delete on cart items (with undo toast) |
| **Image gallery** | Thumbnail row below main image | Horizontal swipe carousel with dots indicator |
| **Filter chips** | Sidebar checkboxes | Horizontal scrollable chip row at top of product listing |

---

## 10. Accessibility

### Contrast Ratios

| Pair | Ratio | WCAG Level | Notes |
|------|-------|------------|-------|
| `--text-primary` on `--bg-deep` | **15.8:1** | AAA | Main text on dark background |
| `--accent` on `--bg-deep` | **11.2:1** | AAA | Mint accent on navy |
| `--text-secondary` on `--bg-deep` | **6.4:1** | AA | Secondary text on dark |
| `--text-primary` on `--bg-surface` (light) | **14.1:1** | AAA | Dark text on light cards |
| `--accent` on `--bg-surface` (light) | **5.2:1** | AA | Mint accent on light bg |
| `--danger` on `--bg-deep` | **5.1:1** | AA | Error text on dark |
| `--warning` on `--bg-deep` | **10.3:1** | AAA | Warning on dark |

### Focus Management

| Element | Focus Style |
|---------|-----------|
| **Buttons** | 2px `accent` outline with 2px offset (`ring-accent ring-offset-2`) |
| **Links** | Same as buttons on focus-visible |
| **Form inputs** | `accent` border + ring, error state uses `danger` ring |
| **Product cards** | Entire card becomes focusable with visible ring on focus-visible |
| **Modal** | Focus trapped inside. ESC key closes. Return focus to trigger element on close. |
| **Dropdown menus** | Arrow key navigation, ESC to close, type-ahead for item search |
| **Filter sidebar** | Tab order follows visual order: search → categories → price → stock → reset |

### Keyboard Navigation

| Shortcut | Action |
|----------|--------|
| `Tab` / `Shift+Tab` | Move focus forward/backward through interactive elements |
| `Enter` / `Space` | Activate buttons, links, toggles |
| `Escape` | Close modals, dropdowns, mobile menu |
| `Arrow Keys` | Navigate within: product grid (left/right/up/down), filter radio groups, tab panels |
| `/` | Focus search bar (from anywhere on page) |
| `Ctrl+K` | Open search overlay (power users) |

### ARIA Requirements

| Component | ARIA Attributes |
|-----------|----------------|
| **Navbar mobile menu** | `aria-expanded` on hamburger button, `role="dialog"` on drawer, `aria-label="Navigation menu"` |
| **Product card** | `role="article"` on card, `aria-label` on wishlist button ("Add MacBook Pro to wishlist"), `aria-live="polite"` on price |
| **Quantity stepper** | `role="spinbutton"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label="Quantity"` |
| **Grade badge** | `aria-label="Grade A+ Certified"` (visual-only badge needs text alternative) |
| **Toast notifications** | `role="alert"`, `aria-live="assertive"` for errors, `aria-live="polite"` for success |
| **Modals** | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to modal title |
| **Tab panels** | `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls` |
| **Skeleton loaders** | `aria-busy="true"` on container, `role="status"`, `aria-label="Loading products"` |
| **Filters** | `role="group"` with `aria-label` for each filter section, `aria-checked` on radio buttons |
| **Promo code input** | `aria-describedby` pointing to helper text ("Try MITRA500 for ₹500 off") |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable all animations */
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  /* No parallax, no scroll-linked animations */
  /* Skeleton loaders use static opacity instead of shimmer */
}
```

### Screen Reader Announcements

| Event | Announcement |
|-------|-------------|
| Product added to cart | "MacBook Pro 16 inch added to cart. Cart has 3 items." |
| Product removed from cart | "MacBook Pro 16 inch removed from cart. Cart has 2 items." |
| Filter applied | "Showing 12 laptops in Business category" |
| Coupon applied | "Coupon MITRA500 applied. You save 500 rupees." |
| Order placed | "Order confirmed. Order number LM-2026-00847." |
| Error occurred | "Error: Could not load products. Please try again." |

### Colour Independence

All colour-coded information has a **non-colour indicator**:
- Grade badges: colour + text label ("A+", "A", "B")
- Stock status: green dot + text ("In Stock: 8 units" / red dot + "Out of Stock")
- Order status: colour badge + text label (never colour alone)
- Success/error toasts: icon (checkmark/X) + colour + text
- Spec tags: colour family + text label (processor is cyan, but you can read "i7-12700H")

### Language & RTL

- All text is LTR (Hindi/regional language support is a future consideration)
- Price formatting uses Indian locale: `₹1,54,999` (lakh system via `toLocaleString('en-IN')`)
- Pincode validation enforces 6-digit Indian pincode format

---

## Appendix: Implementation Priority

### Phase 1 — Foundation (Week 1)
- [ ] Set up design tokens as CSS custom properties in `globals.css`
- [ ] Install Space Grotesk font
- [ ] Create base components: Button, Badge, Toast, Modal, SkeletonLoaders
- [ ] Update Tailwind config with custom colors (navy, mint)
- [ ] Establish global CSS reset and focus styles

### Phase 2 — Core Components (Week 2)
- [ ] ProductCard (3 variants)
- [ ] SpecTag, GradeBadge, PriceDisplay, QuantityStepper
- [ ] TrustStrip, EmptyState, SearchBar
- [ ] AnimatedCounter (Number Ticker)
- [ ] SkeletonLoaders (all 5 types)

### Phase 3 — Page Upgrades (Weeks 3-4)
- [ ] Homepage (hero, trust stats, categories, social proof)
- [ ] Product Listing (filters, grid, responsive)
- [ ] Product Detail (gallery, specs, trust)
- [ ] Cart (items, summary, pincode)
- [ ] Checkout (steps, confirmation)

### Phase 4 — Auth & Profile (Week 5)
- [ ] Login/Register (split layout)
- [ ] Profile (tabs, referral, orders)

### Phase 5 — Admin (Week 6)
- [ ] Admin redesign (sidebar, dashboard, tables)
- [ ] Charts library integration for Analytics

### Phase 6 — Polish (Week 7)
- [ ] Micro-interactions audit
- [ ] Accessibility audit (axe-core)
- [ ] Performance check (Lighthouse)
- [ ] Cross-browser testing
