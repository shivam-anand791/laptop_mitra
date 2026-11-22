/**
 * Laptop Mitra Design Tokens — Color Palette
 *
 * Design Direction:
 * - Premium, approachable technology-retail experience.
 * - Restrained blue accents (#2563EB).
 * - Primary text (#111827).
 * - Light canvas (#F8FAFC).
 * - Clear semantic feedback (success, warning, error, info).
 */

export const colors = {
  // Brand
  brand: {
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    primaryLight: '#EFF6FF',
    primaryBorder: '#BFDBFE',
    navy: '#0B1F4B',
    navyHover: '#071433',
    navyLight: '#1E3A8A',
  },

  // Canvas & Surfaces
  canvas: {
    pageBg: '#F8FAFC',
    cardBg: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    surfaceSubtle: '#F8FAFC',
  },

  // Borders
  border: {
    default: '#E2E8F0',
    subtle: '#F1F5F9',
    strong: '#CBD5E1',
    focus: '#2563EB',
  },

  // Typography
  text: {
    primary: '#111827',
    secondary: '#475569',
    muted: '#94A3B8',
    inverse: '#FFFFFF',
    brand: '#2563EB',
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
