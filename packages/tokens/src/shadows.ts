/**
 * Laptop Mitra Design Tokens — Elevation & Shadows
 * Restrained elevation tailored for clean cream & off-white light surfaces
 * (avoiding heavy dark drop shadows, utilizing warm navy low-alpha diffusion)
 */

export const webShadows = {
  none: 'none',
  xs: '0 1px 2px rgba(11, 31, 75, 0.04)',
  sm: '0 1px 3px rgba(11, 31, 75, 0.05), 0 1px 2px rgba(11, 31, 75, 0.03)',
  md: '0 4px 12px rgba(11, 31, 75, 0.06), 0 2px 4px rgba(11, 31, 75, 0.03)',
  lg: '0 8px 24px rgba(11, 31, 75, 0.08), 0 4px 6px rgba(11, 31, 75, 0.04)',
  xl: '0 16px 40px rgba(11, 31, 75, 0.1), 0 8px 16px rgba(11, 31, 75, 0.04)',
  card: '0 1px 3px rgba(11, 31, 75, 0.04), 0 1px 2px rgba(11, 31, 75, 0.02)',
  cardHover: '0 10px 25px -5px rgba(11, 31, 75, 0.08), 0 8px 10px -6px rgba(11, 31, 75, 0.04)',
  glow: '0 0 20px rgba(37, 99, 235, 0.12)',
} as const;

export const mobileShadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#0B1F4B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0B1F4B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0B1F4B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0B1F4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 5,
  },
  card: {
    shadowColor: '#0B1F4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHover: {
    shadowColor: '#0B1F4B',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 4,
  },
} as const;
