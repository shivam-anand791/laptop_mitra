import {
  colors as sharedColors,
  spacing as sharedSpacing,
  radius as sharedRadius,
  mobileShadows,
  typography as sharedTypography,
  accessibility as sharedAccessibility,
} from '@laptopmitra/tokens';

export const colors = {
  // Brand — Restrained blue #2563EB & Tech Navy
  primary: sharedColors.brand.primary,
  primaryHover: sharedColors.brand.primaryHover,
  primaryLight: sharedColors.brand.primaryLight,
  primaryBorder: sharedColors.brand.primaryBorder,

  navy: sharedColors.brand.navy,
  navyHover: sharedColors.brand.navyHover,
  navyLight: sharedColors.brand.navyLight,

  // Canvas & Surfaces — Light canvas #F8FAFC & Clean Cards
  pageBg: sharedColors.canvas.pageBg,
  cardBg: sharedColors.canvas.cardBg,
  cardBorder: sharedColors.border.default,
  cardBorderLight: sharedColors.border.subtle,

  // Text Hierarchy — Primary #111827
  textPrimary: sharedColors.text.primary,
  textSecondary: sharedColors.text.secondary,
  textMuted: sharedColors.text.muted,
  textWhite: sharedColors.text.inverse,

  // Semantic Status & Feedback
  green: sharedColors.semantic.success.main,
  greenText: sharedColors.semantic.success.text,
  greenLight: sharedColors.semantic.success.bg,
  greenBorder: sharedColors.semantic.success.border,

  orange: sharedColors.semantic.warning.main,
  orangeText: sharedColors.semantic.warning.text,
  orangeLight: sharedColors.semantic.warning.bg,
  orangeBorder: sharedColors.semantic.warning.border,

  danger: sharedColors.semantic.error.main,
  dangerText: sharedColors.semantic.error.text,
  dangerLight: sharedColors.semantic.error.bg,
  dangerBorder: sharedColors.semantic.error.border,

  info: sharedColors.semantic.info.main,
  infoText: sharedColors.semantic.info.text,
  infoLight: sharedColors.semantic.info.bg,
  infoBorder: sharedColors.semantic.info.border,
} as const;

export const spacing = {
  none: sharedSpacing.none,
  xxs: sharedSpacing.xxs,
  xs: sharedSpacing.xs,
  sm: sharedSpacing.sm,
  md: sharedSpacing.md,
  lg: sharedSpacing.base, // 16
  xl: sharedSpacing.lg,   // 20
  xxl: sharedSpacing.xl,  // 24
  xxxl: sharedSpacing['2xl'], // 32
} as const;

export const radius = {
  none: sharedRadius.none,
  xs: sharedRadius.xs,
  sm: sharedRadius.sm,
  md: sharedRadius.md,
  lg: sharedRadius.lg,
  xl: sharedRadius.xl,
  xxl: sharedRadius['2xl'],
  full: sharedRadius.full,
} as const;

export const shadows = {
  none: mobileShadows.none,
  sm: mobileShadows.sm,
  md: mobileShadows.md,
  lg: mobileShadows.lg,
  card: mobileShadows.card,
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

export const accessibility = {
  minTouchTarget: sharedAccessibility.minTouchTargetMobile,
  maxFontMultiplier: sharedAccessibility.textScaling.maxMultiplier,
} as const;

export { sharedColors, sharedSpacing, sharedRadius, sharedTypography, sharedAccessibility };
