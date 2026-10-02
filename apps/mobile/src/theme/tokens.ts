export const colors = {
  // Brand
  primary: '#1D6FF2',
  primaryHover: '#1558C0',
  primaryLight: '#EFF6FF',
  primaryBorder: '#BFDBFE',

  navy: '#0B1F4B',
  navyHover: '#162D66',
  navyLight: '#1E3A8A',

  // Canvas & Surfaces
  pageBg: '#F5F7FA',
  cardBg: '#FFFFFF',
  cardBorder: '#E2E8F0',
  cardBorderLight: '#F1F5F9',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textWhite: '#FFFFFF',

  // Status & Feedback
  green: '#10B981',
  greenText: '#047857',
  greenLight: '#ECFDF5',
  greenBorder: '#A7F3D0',

  orange: '#F59E0B',
  orangeText: '#B45309',
  orangeLight: '#FFFBEB',
  orangeBorder: '#FDE68A',

  danger: '#EF4444',
  dangerText: '#DC2626',
  dangerLight: '#FEF2F2',
  dangerBorder: '#FECACA',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

export const shadows = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0B1F4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0B1F4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export const typography = {
  h1: {
    fontSize: 22,
    fontWeight: '800' as const,
    lineHeight: 28,
    color: colors.navy,
  },
  h2: {
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
    color: colors.navy,
  },
  h3: {
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  bodyBold: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 15,
    color: colors.textSecondary,
  },
  badge: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
  },
} as const;
