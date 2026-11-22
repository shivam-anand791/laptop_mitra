/**
 * Laptop Mitra Design Tokens — Typography
 * Readable, high-legibility typographic scale with editorial restraint
 */

export const fontFamilies = {
  sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  display: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
} as const;

export const fontSizes = {
  '2xs': 10,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const fontWeights = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const lineHeights = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

export const letterSpacings = {
  tighter: '-0.03em',
  tight: '-0.015em',
  normal: '0em',
  wide: '0.02em',
  wider: '0.04em',
} as const;

/**
 * Editorial typography scale for headings and body hierarchy
 */
export const editorialTypography = {
  hero: {
    fontSize: fontSizes['5xl'],
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.extrabold,
    letterSpacing: letterSpacings.tighter,
  },
  display: {
    fontSize: fontSizes['4xl'],
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tight,
  },
  h1: {
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights.snug,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tight,
  },
  h2: {
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights.snug,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.tight,
  },
  h3: {
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.normal,
  },
  h4: {
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.normal,
  },
  bodyLarge: {
    fontSize: fontSizes.base,
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacings.normal,
  },
  body: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacings.normal,
  },
  caption: {
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.snug,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.wide,
  },
  badge: {
    fontSize: fontSizes['2xs'],
    lineHeight: 1.2,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.wider,
  },
} as const;

export const typography = {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
  editorial: editorialTypography,
} as const;
