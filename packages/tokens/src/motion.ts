/**
 * Laptop Mitra Design Tokens — Motion Foundation
 *
 * Motion Philosophy:
 * - Calm while browsing.
 * - Responsive while interacting.
 * - Smooth while navigating.
 * - Purposeful motion instead of excessive decoration.
 * - Apple-style restraint with gentle cubic-bezier curve.
 */

export const motionDurations = {
  /** Quick feedback: button clicks, icon toggles, switches (120ms) */
  micro: 120,
  /** Interactive state transitions: hover, active, focus shifts (180ms) */
  hover: 180,
  /** Component popovers: dropdowns, tabs, segmented controls (220ms) */
  dropdown: 220,
  /** Overlays: modals, drawers, bottom sheets, full dialogs (250ms) */
  modal: 250,
  /** Page elements: card fade-ins, filter expansions, content reveals (500ms) */
  reveal: 500,
  /** High-impact entrances: hero laptop visual, primary landing header (750ms) */
  hero: 750,
} as const;

export type MotionDurationKey = keyof typeof motionDurations;

export const motionDurationsMs = {
  micro: '120ms',
  hover: '180ms',
  dropdown: '220ms',
  modal: '250ms',
  reveal: '500ms',
  hero: '750ms',
} as const;

/**
 * Standard cubic-bezier easing functions.
 * Default curve: cubic-bezier(0.16, 1, 0.3, 1) provides a natural, Apple-like deceleration.
 */
export const motionEasings = {
  /** Primary brand curve: smooth natural deceleration */
  default: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Enter transitions: elements entering the viewport */
  enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Exit transitions: quick exit without bounce */
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  /** Subtle spring for playful tactile confirmations (badges, heart icons) */
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  /** Linear for infinite rotations/progress */
  linear: 'linear',
} as const;

/**
 * Cubic bezier control points array [x1, y1, x2, y2]
 * for native animation engines (e.g. React Native Easing.bezier).
 */
export const motionBezier = {
  default: [0.16, 1, 0.3, 1] as const,
  enter: [0.16, 1, 0.3, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
};

/**
 * Pre-composed CSS transition strings for common web interactive surfaces.
 */
export const motionTransitions = {
  micro: `all ${motionDurationsMs.micro} ${motionEasings.default}`,
  hover: `all ${motionDurationsMs.hover} ${motionEasings.default}`,
  dropdown: `all ${motionDurationsMs.dropdown} ${motionEasings.default}`,
  modal: `all ${motionDurationsMs.modal} ${motionEasings.default}`,
  reveal: `all ${motionDurationsMs.reveal} ${motionEasings.default}`,
  hero: `all ${motionDurationsMs.hero} ${motionEasings.default}`,
  transform: `transform ${motionDurationsMs.hover} ${motionEasings.default}`,
  opacity: `opacity ${motionDurationsMs.hover} ${motionEasings.default}`,
  colors: `background-color ${motionDurationsMs.hover} ${motionEasings.default}, border-color ${motionDurationsMs.hover} ${motionEasings.default}, color ${motionDurationsMs.hover} ${motionEasings.default}`,
} as const;

/**
 * Accessibility standards for motion.
 * When prefers-reduced-motion is active, durations collapse to instant or near-instant.
 */
export const motionReduced = {
  duration: 0.01,
  durationMs: '0.01ms',
  easing: 'linear',
} as const;

export const motion = {
  durations: motionDurations,
  durationsMs: motionDurationsMs,
  easings: motionEasings,
  bezier: motionBezier,
  transitions: motionTransitions,
  reduced: motionReduced,
} as const;

export type Motion = typeof motion;
