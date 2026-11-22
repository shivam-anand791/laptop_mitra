/**
 * Laptop Mitra Design Tokens — Elevation & Shadows
 * Restrained elevation tailored for clean light surfaces (avoiding heavy dark drop shadows)
 */

export const webShadows = {
  none: 'none',
  xs: '0 1px 2px rgba(17, 24, 39, 0.04)',
  sm: '0 1px 3px rgba(17, 24, 39, 0.06), 0 1px 2px rgba(17, 24, 39, 0.04)',
  md: '0 4px 6px -1px rgba(17, 24, 39, 0.08), 0 2px 4px -2px rgba(17, 24, 39, 0.04)',
  lg: '0 10px 15px -3px rgba(17, 24, 39, 0.08), 0 4px 6px -4px rgba(17, 24, 39, 0.03)',
  xl: '0 20px 25px -5px rgba(17, 24, 39, 0.08), 0 8px 10px -6px rgba(17, 24, 39, 0.03)',
  card: '0 1px 3px rgba(11, 31, 75, 0.04), 0 1px 2px rgba(11, 31, 75, 0.02)',
  cardHover: '0 10px 25px -5px rgba(11, 31, 75, 0.08), 0 8px 10px -6px rgba(11, 31, 75, 0.04)',
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
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1.5,
    elevation: 1,
  },
  sm: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0B1F4B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0B1F4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  card: {
    shadowColor: '#0B1F4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;
