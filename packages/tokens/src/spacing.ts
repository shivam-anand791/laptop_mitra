/**
 * Laptop Mitra Design Tokens — Spacing Scale
 * Predictable 4px grid system
 */

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export type Spacing = typeof spacing;

/**
 * Spacing formatted as rem string for web layouts
 */
export const spacingRem = {
  none: '0rem',
  xxs: '0.125rem',
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  base: '1rem',
  lg: '1.25rem',
  xl: '1.5rem',
  '2xl': '2rem',
  '3xl': '2.5rem',
  '4xl': '3rem',
  '5xl': '4rem',
} as const;
