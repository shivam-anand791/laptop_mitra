/**
 * Laptop Mitra Design Tokens — Accessibility Standards (WCAG 2.1 AA)
 */

export const accessibility = {
  /**
   * Minimum touch target dimensions:
   * - 44px on iOS / Web
   * - 48px on Android
   */
  minTouchTargetWeb: 44,
  minTouchTargetMobile: 48,

  /**
   * Color contrast thresholds:
   * - Normal text (< 18pt or < 14pt bold): 4.5:1
   * - Large text (>= 18pt or >= 14pt bold): 3.0:1
   * - UI components and graphical objects: 3.0:1
   */
  contrastRatio: {
    normalText: 4.5,
    largeText: 3.0,
    uiComponent: 3.0,
  },

  /**
   * Standard focus outline for keyboard navigation
   */
  focusRing: {
    width: 2,
    offset: 2,
    color: '#2563EB',
    style: 'solid',
  },

  /**
   * Dynamic font scaling bounds (React Native maxFontSizeMultiplier / Web rem)
   */
  textScaling: {
    maxMultiplier: 1.5,
    allowFontScaling: true,
  },
} as const;
