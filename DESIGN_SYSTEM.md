# Laptop Mitra Cross-Platform Design System

This document outlines the shared design language, tokens, and standardized UI component library for the Laptop Mitra web and mobile platforms.

---

## 1. Design Direction & Core Philosophy

Laptop Mitra's interface is built as a **premium, approachable technology-retail experience**:
- **Light Canvas**: `#F8FAFC` (Slate-50) creates a bright, clean background that lets products take center stage.
- **Card Surfaces**: Pure white (`#FFFFFF`) cards with subtle borders (`#E2E8F0`) and soft, natural shadows.
- **Restrained Blue Accent**: `#2563EB` (Tailwind Blue-600) with hover state `#1D4ED8` and tint `#EFF6FF` for purposeful interactive emphasis.
- **Deep Tech Navy**: `#0B1F4B` for primary brand accents and domain-specific refurbished badges.
- **High-Legibility Typography**: Primary text `#111827` provides high contrast (>16:1 ratio against canvas), secondary text `#475569`, and muted text `#94A3B8`.
- **Consistent Semantic Feedback**: Dedicated, standardized states for success, warning, error, and info across platforms.
- **Restrained Elevation**: Subtle 1px–4px shadow offsets without heavy dark drop shadows or oversized glassmorphic effects.

---

## 2. Shared Design Tokens (`@laptopmitra/tokens`)

The canonical tokens live in `packages/tokens` and are published as the workspace package `@laptopmitra/tokens`.

```typescript
import {
  colors,
  spacing,
  radius,
  typography,
  webShadows,
  mobileShadows,
  accessibility,
} from '@laptopmitra/tokens';
```

### Color Palette

| Token | Hex Value | Intent / Usage |
|---|---|---|
| `colors.brand.primary` | `#2563EB` | Interactive buttons, active links, primary accents |
| `colors.brand.primaryHover` | `#1D4ED8` | Hover / pressed state for primary elements |
| `colors.brand.primaryLight` | `#EFF6FF` | Tints, selection pills, subtle highlights |
| `colors.brand.navy` | `#0B1F4B` | Refurbished badge, secondary button, brand headings |
| `colors.canvas.pageBg` | `#F8FAFC` | Main application background canvas |
| `colors.canvas.cardBg` | `#FFFFFF` | Product cards, modals, table rows, drawers |
| `colors.border.default` | `#E2E8F0` | Card borders, dividers, standard input borders |
| `colors.border.subtle` | `#F1F5F9` | Inner table dividers, secondary borders |
| `colors.text.primary` | `#111827` | Headings, titles, high-priority body text |
| `colors.text.secondary` | `#475569` | Descriptions, specifications, metadata |
| `colors.text.muted` | `#94A3B8` | Placeholders, disabled text, helper labels |
| `colors.semantic.success.main` | `#16A34A` | Stock availability, completed orders, Grade A+ |
| `colors.semantic.warning.main` | `#D97706` | Low stock warnings, pending reviews, Grade B |
| `colors.semantic.error.main` | `#DC2626` | Validation errors, failed payments, cancellations |
| `colors.semantic.info.main` | `#2563EB` | Informational callouts, active filters |

### Spacing Scale (4px Base Grid)

```
none: 0px  |  xxs: 2px  |  xs: 4px   |  sm: 8px   |  md: 12px
base: 16px |  lg: 20px  |  xl: 24px  |  2xl: 32px |  3xl: 40px | 4xl: 48px
```

### Corner Radii

```
none: 0px  |  xs: 4px  |  sm: 6px   |  md: 8px   |  lg: 12px
xl: 16px   |  2xl: 24px|  full: 9999px
```

---

## 3. Web UI Component Library (`apps/web/components/ui`)

Web components are exported from `apps/web/components/ui` and can be imported together:

```tsx
import { Button, Input, Select, Badge, GradeBadge, Alert, ErrorState } from '@/components/ui';
```

### Standardized Components

1. **`Button`**:
   - Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`.
   - Sizes: `sm` (36px), `md` (44px WCAG touch target), `lg` (48px).
   - Features: Built-in loading spinner, left/right icons, `aria-busy`, keyboard focus ring (`ring-2 ring-[#2563EB]`).
2. **`Input`**:
   - Features: Accessible labels with required asterisks, helper text, inline error message with `role="alert"`, `aria-invalid`, `aria-describedby`, optional leading and trailing icons.
   - Sizing: Minimum height of 44px for reliable touch targets.
3. **`Select`**:
   - Features: Accessible dropdown select styled consistently with `Input`, custom SVG chevron, error and helper states.
4. **`Badge` & `GradeBadge`**:
   - Variants: `primary`, `secondary`, `success`, `warning`, `danger`, `info`, `refurb`, `bestSeller`, `newArrival`, `hotDeal`, `inStock`.
   - Grades: `A+` (Certified Mint), `A` (Certified Excellent), `B` (Good Condition).
5. **`Alert`**:
   - Semantic variants: `info`, `success`, `warning`, `error`.
   - Accessible: Automatically sets `role="alert"` for errors and `role="status"` for non-critical alerts; supports dismissal callback.
6. **`PriceDisplay` (`apps/web/components/PriceDisplay.tsx`)**:
   - Displays formatted Indian Rupees (`₹`), compare-at strike-through MRP, savings amount & discount percentage, and optional No-Cost EMI breakdown.
7. **`ProductCard` (`apps/web/components/ProductCard.tsx`)**:
   - Displays 4:3 product image frame, Grade badge, 1-Year Warranty tag, glanceable specs (RAM, Storage, Processor), price hierarchy, and Add to Cart action.
8. **`EmptyState` (`apps/web/components/EmptyState.tsx`)**:
   - Approachable illustration or icon, clear title, concise description, and call-to-action button.
9. **`ErrorState` (`apps/web/components/ui/ErrorState.tsx`)**:
   - Retryable error banner with friendly message and developer error payload in development.

---

## 4. Mobile React Native Component Library (`apps/mobile/src/components/ui`)

Mobile components are optimized for touch interaction, safe areas, compact layouts, and keyboard avoiding behavior:

```tsx
import {
  Button,
  Input,
  Badge,
  PriceDisplay,
  Alert,
  EmptyState,
  ErrorState,
  LoadingState,
} from './components/ui';
```

### Standardized Mobile Components

1. **`Button`**:
   - Variants: `primary`, `navy`, `outline`, `secondary`, `ghost`, `danger`.
   - Sizes: `sm` (36dp), `md` (44dp minimum touch target), `lg` (52dp).
   - Features: Native `ActivityIndicator`, touch feedback via `activeOpacity`, `accessibilityRole="button"`.
2. **`Input`**:
   - Features: Minimum 48dp touch height, focused and error border highlights, password visibility toggle, leading icons, error message row with `accessibilityRole="alert"`.
   - Accessibility: Bound to `maxFontSizeMultiplier` for text scaling.
3. **`PriceDisplay`**:
   - Sizing: `sm`, `md`, `lg`.
   - Visual hierarchy: Bold price, strike-through original MRP, green savings badge, and optional EMI breakdown.
4. **`Alert`**:
   - Semantic feedback banner with Ionicons, readable text, and optional dismiss action.
5. **`EmptyState`**:
   - Centered icon circle, bold header, friendly description, and primary action button.
6. **`ErrorState`**:
   - Centered error icon, message, and `Try Again` action button.
7. **`LoadingState`**:
   - Centered `ActivityIndicator` with accessible status message.
8. **`ProductCard` (`apps/mobile/src/components/ProductCard.tsx`)**:
   - Touch-optimized card with image, Grade/Refurb badges, stock chip, specs snippet, price display, and Quick Add action.

---

## 5. Accessibility Rules & Guidelines (WCAG 2.1 AA)

1. **Minimum Touch Targets**:
   - Web: Minimum 44×44px for buttons, inputs, and interactive pills.
   - Mobile: Minimum 48×48dp for all primary inputs and touchable areas.
2. **Color Contrast**:
   - Primary text (`#111827`) on light canvas (`#F8FAFC`): **16.5:1** (exceeds WCAG AAA).
   - Brand blue (`#2563EB`) on white (`#FFFFFF`): **4.56:1** (meets WCAG AA).
   - White text on Brand blue (`#2563EB`): **4.56:1** (meets WCAG AA).
   - White text on Brand navy (`#0B1F4B`): **15.2:1** (exceeds WCAG AAA).
3. **Keyboard Focus Navigation (Web)**:
   - Interactive elements must include visible focus outlines:
     `focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2`.
4. **Screen Reader Support**:
   - Semantic roles: `role="alert"`, `role="status"`, `role="article"`.
   - Every input has an accessible `label` linked via `htmlFor` / `id`.
   - Screen-reader price labels announce full currency context (`Price: ₹54,999, original price ₹64,999`).
5. **Text Scaling (Mobile)**:
   - Mobile text components support `maxFontSizeMultiplier={1.5}` to allow users with visual impairments to increase OS font sizes without layout clipping.

---

## 6. Guidelines for Implementing New Screens in Phase 7

When constructing or redesigning screens in Phase 7:
1. **Always use `@laptopmitra/tokens` or Tailwind theme variables**:
   - Avoid hardcoding arbitrary hex colors or pixel dimensions in component files.
   - Use `bg-[var(--bg-deep)]` or `bg-slate-50` for page canvas.
   - Use `bg-white` and `border-[#E2E8F0]` for cards.
2. **Prefer Standardized UI Components**:
   - Web: Import buttons, form fields, badges, alerts, and empty states from `@/components/ui`.
   - Mobile: Import buttons, inputs, alerts, price displays, and empty states from `../components/ui`.
3. **Handle State Consistently**:
   - Every data-fetching screen must provide:
     - **Loading State**: Skeleton cards (`ProductCardSkeleton`) or `LoadingState`.
     - **Empty State**: `EmptyState` with a helpful description and actionable button.
     - **Error State**: `ErrorState` with a retry handler (`onRetry`).
     - **Success / Feedback State**: `Alert` or toast notification for mutations.
4. **Preserve Separation of Concerns**:
   - Presentation components must remain decoupled from backend APIs and Firebase logic. Pass data and callbacks as props.
