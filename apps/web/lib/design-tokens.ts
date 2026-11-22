/**
 * LaptopMitra Design System Tokens (apps/web)
 * Plain TypeScript object representation matching LaptopMitra visual & motion direction.
 * Portable across web and mobile platforms without external runtime dependencies.
 */

import { motion as sharedMotion } from '@laptopmitra/tokens';

export const colors = {
  // Brand & Accents
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primaryActive: '#1E40AF',
  primaryLight: '#EFF6FF',
  primaryBorder: '#BFDBFE',

  // Deep Tech Navy (Hero & Footer Anchors, Refurbished Badges)
  navy: {
    DEFAULT: '#0B1F4B',
    50: '#F0F4FC',
    100: '#E1E9F8',
    200: '#C3D3F1',
    500: '#1C4294',
    600: '#132E6B',
    700: '#0F265C',
    800: '#0B1F4B',
    900: '#071433',
    950: '#040B1D',
  },

  // Surfaces & Canvas (Cream & Off-White Identity)
  canvas: {
    page: '#F7F4EE',
    card: '#FFFDF9',
    elevated: '#FAF6EF',
    subtle: '#F2ECE2',
    cream: '#F7F4EE',
    ivory: '#FFFDF9',
    pureWhite: '#FFFFFF',
  },

  // Borders & Dividers
  border: {
    default: '#E6DFD5',
    subtle: '#F0EAE1',
    strong: '#CBD5E1',
    active: '#2563EB',
  },

  // Typography Colors
  text: {
    primary: '#111827',
    secondary: '#475569',
    muted: '#94A3B8',
    white: '#FFFFFF',
    navy: '#0B1F4B',
    inverseMuted: '#94A3B8',
  },

  // Status & Feedback Badges
  status: {
    success: '#16A34A',
    successBg: '#F0FDF4',
    successBorder: '#BBF7D0',
    warning: '#D97706',
    warningBg: '#FFFBEB',
    warningBorder: '#FDE68A',
    danger: '#DC2626',
    dangerBg: '#FEF2F2',
    dangerBorder: '#FECACA',
    orange: '#EA580C',
    orangeBg: '#FFF7ED',
    orangeBorder: '#FFEDD5',
    info: '#2563EB',
    infoBg: '#EFF6FF',
    infoBorder: '#BFDBFE',
  },
} as const;

export const spacing = {
  0: '0px',
  1: '0.25rem', // 4px
  2: '0.5rem',  // 8px
  3: '0.75rem', // 12px
  4: '1rem',    // 16px
  5: '1.25rem', // 20px
  6: '1.5rem',  // 24px
  8: '2rem',    // 32px
  10: '2.5rem', // 40px
  12: '3rem',   // 48px
  16: '4rem',   // 64px
  20: '5rem',   // 80px
  24: '6rem',   // 96px
} as const;

export const layoutTokens = {
  container: {
    maxWidth: '1280px',
    padding: {
      mobile: '16px',   // < 640px (px-4)
      tablet: '24px',   // 640-1023px (sm:px-6)
      desktop: '32px',  // >= 1024px (lg:px-8)
    },
    classes: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  },
  section: {
    paddingY: {
      mobile: '48px',   // < 640px (py-12)
      tablet: '64px',   // 640-1023px (sm:py-16)
      desktop: '80px',  // >= 1024px (lg:py-20)
    },
    classes: 'py-12 sm:py-16 lg:py-20',
  },
  headingBlock: {
    eyebrowToTitle: 'mb-2', // 8px
    titleToSubtitle: 'mt-2.5 sm:mt-3', // 10-12px
    blockToContent: 'mb-6 lg:mb-8', // 24px mobile / 32px desktop
  },
  header: {
    height: '64px',
    stickyOffset: '80px',
    scrollMarginTop: 'scroll-mt-20',
  },
  buttons: {
    heights: {
      sm: '40px',
      md: '44px',
      lg: '48px',
    },
    minTouchTarget: '44px',
  },
  grid: {
    product: 'gap-4 sm:gap-6',
    category: 'gap-4 sm:gap-6',
    footer: 'gap-8 lg:gap-12',
  },
} as const;

export const radius = {
  none: '0px',
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
} as const;

export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(11, 31, 75, 0.04)',
  sm: '0 1px 3px 0 rgba(11, 31, 75, 0.05), 0 1px 2px 0 rgba(11, 31, 75, 0.03)',
  md: '0 4px 12px -2px rgba(11, 31, 75, 0.06), 0 2px 4px -1px rgba(11, 31, 75, 0.03)',
  lg: '0 8px 24px -3px rgba(11, 31, 75, 0.08), 0 4px 6px -2px rgba(11, 31, 75, 0.04)',
  xl: '0 16px 40px -4px rgba(11, 31, 75, 0.10), 0 8px 16px -4px rgba(11, 31, 75, 0.04)',
  card: '0 1px 3px rgba(11, 31, 75, 0.04), 0 1px 2px rgba(11, 31, 75, 0.02)',
  cardHover: '0 10px 25px -5px rgba(11, 31, 75, 0.08), 0 8px 10px -6px rgba(11, 31, 75, 0.04)',
  glow: '0 0 20px 0 rgba(37, 99, 235, 0.12)',
} as const;

export const motionTokens = {
  duration: {
    micro: sharedMotion.durationsMs.micro,       // 120ms
    hover: sharedMotion.durationsMs.hover,       // 180ms
    dropdown: sharedMotion.durationsMs.dropdown, // 220ms
    modal: sharedMotion.durationsMs.modal,       // 250ms
    reveal: sharedMotion.durationsMs.reveal,     // 500ms
    hero: sharedMotion.durationsMs.hero,         // 750ms
    // Backward compatibility
    fast: sharedMotion.durationsMs.micro,
    normal: sharedMotion.durationsMs.dropdown,
    slow: sharedMotion.durationsMs.reveal,
    counter: '1800ms',
    marquee: '52s',
  },
  easing: {
    default: sharedMotion.easings.default,       // cubic-bezier(0.16, 1, 0.3, 1)
    enter: sharedMotion.easings.enter,
    exit: sharedMotion.easings.exit,
    spring: sharedMotion.easings.spring,
    springOut: sharedMotion.easings.default,
    hover: sharedMotion.easings.default,
    smooth: sharedMotion.easings.default,
  },
} as const;
