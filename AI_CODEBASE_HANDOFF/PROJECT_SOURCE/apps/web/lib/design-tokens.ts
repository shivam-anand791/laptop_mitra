/**
 * LaptopMitra Design System Tokens (apps/web)
 * Plain TypeScript object representation matching Image 1 art direction.
 * Portable across web and mobile platforms without external runtime dependencies.
 */

export const colors = {
  // Brand & Accents
  primary: '#1D6FF2',
  primaryHover: '#1558C0',
  primaryLight: '#EBF2FF',
  primaryBorder: '#C2D9FD',

  // Deep Enterprise Navy (Hero & Footer Anchors)
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

  // Surfaces & Canvas
  canvas: {
    page: '#F5F7FA',
    card: '#FFFFFF',
    elevated: '#F8FAFC',
    subtle: '#F1F5F9',
  },

  // Borders & Dividers
  border: {
    default: '#E4E9F2',
    subtle: '#EEF2F6',
    strong: '#CBD5E1',
    active: '#1D6FF2',
  },

  // Typography Colors
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#64748B',
    white: '#FFFFFF',
    inverseMuted: '#94A3B8',
  },

  // Status & Feedback Badges
  status: {
    success: '#16A34A',
    successBg: '#DCFCE7',
    successBorder: '#BBF7D0',
    warning: '#F59E0B',
    warningBg: '#FEF3C7',
    warningBorder: '#FDE68A',
    danger: '#EF4444',
    dangerBg: '#FEE2E2',
    dangerBorder: '#FECACA',
    orange: '#F97316',
    orangeBg: '#FFF7ED',
    orangeBorder: '#FFEDD5',
    info: '#3B82F6',
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
  md: '10px',
  lg: '14px',
  xl: '20px',
  '2xl': '28px',
  full: '9999px',
} as const;

export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(11, 31, 75, 0.04)',
  sm: '0 1px 3px 0 rgba(11, 31, 75, 0.06), 0 1px 2px 0 rgba(11, 31, 75, 0.04)',
  md: '0 4px 12px -2px rgba(11, 31, 75, 0.08), 0 2px 6px -1px rgba(11, 31, 75, 0.04)',
  lg: '0 10px 25px -3px rgba(11, 31, 75, 0.10), 0 4px 10px -2px rgba(11, 31, 75, 0.04)',
  xl: '0 20px 40px -4px rgba(11, 31, 75, 0.12), 0 8px 16px -4px rgba(11, 31, 75, 0.04)',
  glow: '0 0 24px 0 rgba(29, 111, 242, 0.20)',
} as const;

export const motionTokens = {
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
    counter: '1800ms',
    marquee: '28s',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    springOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
    hover: 'cubic-bezier(0.2, 0, 0, 1)',
    smooth: 'cubic-bezier(0.25, 1, 0.5, 1)',
  },
} as const;
