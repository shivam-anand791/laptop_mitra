/**
 * Laptop Mitra Design Tokens — Color Palette
 *
 * Design Direction:
 * - Premium, approachable technology-retail experience.
 * - Restrained LaptopMitra blue (#2563EB) & deep tech navy (#0B1F4B).
 * - Warm cream (#F7F4EE) and ivory off-white (#FFFDF9) surfaces inspired by editorial tech retail.
 * - Subtle, warm borders (#E6DFD5).
 * - Primary text (#111827).
 * - Clear semantic feedback (success, warning, error, info).
 */

export const colors = {
  // Brand
  brand: {
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    primaryActive: '#1E40AF',
    primaryLight: '#EFF6FF',
    primaryBorder: '#BFDBFE',
    navy: '#0B1F4B',
    navyHover: '#071433',
    navyLight: '#132E6B',
    navyDim: '#1E3A8A',
  },

  // Canvas & Surfaces (Cream & Off-White Identity)
  canvas: {
    /** Primary warm cream page canvas */
    pageBg: '#F7F4EE',
    /** Warm off-white / ivory card surface */
    cardBg: '#FFFDF9',
    /** Slightly elevated cream card / container */
    surfaceElevated: '#FAF6EF',
    /** Subtle warm container / chip background */
    surfaceSubtle: '#F2ECE2',
    /** Pure crisp white for image cutouts & nested surfaces */
    pureWhite: '#FFFFFF',
    /** Canonical alias for cream background */
    cream: '#F7F4EE',
    /** Canonical alias for ivory card surface */
    ivory: '#FFFDF9',
  },

  // Borders
  border: {
    /** Default warm subtle card & input border */
    default: '#E6DFD5',
    /** Ultra-subtle divider border */
    subtle: '#F0EAE1',
    /** Stronger border for emphasis or active states */
    strong: '#CBD5E1',
    /** Focus ring indicator */
    focus: '#2563EB',
  },

  // Interactive States
  states: {
    focusRing: '#2563EB',
    focusRingOffset: '#F7F4EE',
    hoverSubtle: 'rgba(11, 31, 75, 0.04)',
    activeSubtle: 'rgba(11, 31, 75, 0.08)',
    disabledBg: '#F1F5F9',
    disabledText: '#94A3B8',
    disabledBorder: '#E2E8F0',
  },

  // Typography
  text: {
    primary: '#111827',
    secondary: '#475569',
    muted: '#94A3B8',
    inverse: '#FFFFFF',
    brand: '#2563EB',
    navy: '#0B1F4B',
  },

  // Semantic Feedback
  semantic: {
    success: {
      main: '#16A34A',
      text: '#15803D',
      bg: '#F0FDF4',
      border: '#BBF7D0',
    },
    warning: {
      main: '#D97706',
      text: '#B45309',
      bg: '#FFFBEB',
      border: '#FDE68A',
    },
    error: {
      main: '#DC2626',
      text: '#B91C1C',
      bg: '#FEF2F2',
      border: '#FECACA',
    },
    info: {
      main: '#2563EB',
      text: '#1D4ED8',
      bg: '#EFF6FF',
      border: '#BFDBFE',
    },
  },

  // Badges & Domain Indicators
  badge: {
    refurb: {
      bg: '#0B1F4B',
      text: '#FFFFFF',
      border: '#0B1F4B',
    },
    bestSeller: {
      bg: '#2563EB',
      text: '#FFFFFF',
      border: '#2563EB',
    },
    newArrival: {
      bg: '#EFF6FF',
      text: '#2563EB',
      border: '#BFDBFE',
    },
    hotDeal: {
      bg: '#EA580C',
      text: '#FFFFFF',
      border: '#EA580C',
    },
    inStock: {
      bg: '#F0FDF4',
      text: '#16A34A',
      border: '#BBF7D0',
    },
    gradeAPlus: {
      bg: '#F0FDF4',
      text: '#15803D',
      border: '#BBF7D0',
    },
    gradeA: {
      bg: '#EFF6FF',
      text: '#2563EB',
      border: '#BFDBFE',
    },
    gradeB: {
      bg: '#FFFBEB',
      text: '#B45309',
      border: '#FDE68A',
    },
  },
} as const;

export type Colors = typeof colors;
