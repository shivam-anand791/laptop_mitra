/**
 * Laptop Mitra Mobile Motion Utilities
 *
 * Platform-appropriate animations for React Native (Expo) using native driver
 * and standard LaptopMitra easing cubic-bezier(0.16, 1, 0.3, 1).
 */

import { Animated, Easing } from 'react-native';
import { motion as sharedMotion } from '@laptopmitra/tokens';

export const mobileMotionDurations = sharedMotion.durations;

/**
 * Standard LaptopMitra cubic-bezier easing for React Native
 */
export const mobileEasing = {
  default: Easing.bezier(
    sharedMotion.bezier.default[0],
    sharedMotion.bezier.default[1],
    sharedMotion.bezier.default[2],
    sharedMotion.bezier.default[3]
  ),
  spring: Easing.bezier(
    sharedMotion.bezier.spring[0],
    sharedMotion.bezier.spring[1],
    sharedMotion.bezier.spring[2],
    sharedMotion.bezier.spring[3]
  ),
  exit: Easing.bezier(
    sharedMotion.bezier.exit[0],
    sharedMotion.bezier.exit[1],
    sharedMotion.bezier.exit[2],
    sharedMotion.bezier.exit[3]
  ),
  linear: Easing.linear,
};

export interface MotionOptions {
  duration?: number;
  delay?: number;
  easing?: (value: number) => number;
  useNativeDriver?: boolean;
}

/**
 * Fade In animation
 */
export function animateFadeIn(
  value: Animated.Value,
  options?: MotionOptions
): Animated.CompositeAnimation {
  return Animated.timing(value, {
    toValue: 1,
    duration: options?.duration ?? mobileMotionDurations.reveal,
    delay: options?.delay ?? 0,
    easing: options?.easing ?? mobileEasing.default,
    useNativeDriver: options?.useNativeDriver ?? true,
  });
}

/**
 * Fade Up animation (combines opacity and translateY)
 */
export function animateFadeUp(
  opacity: Animated.Value,
  translateY: Animated.Value,
  options?: MotionOptions & { fromY?: number }
): Animated.CompositeAnimation {
  const fromY = options?.fromY ?? 14;
  translateY.setValue(fromY);
  opacity.setValue(0);

  return Animated.parallel([
    Animated.timing(opacity, {
      toValue: 1,
      duration: options?.duration ?? mobileMotionDurations.reveal,
      delay: options?.delay ?? 0,
      easing: options?.easing ?? mobileEasing.default,
      useNativeDriver: options?.useNativeDriver ?? true,
    }),
    Animated.timing(translateY, {
      toValue: 0,
      duration: options?.duration ?? mobileMotionDurations.reveal,
      delay: options?.delay ?? 0,
      easing: options?.easing ?? mobileEasing.default,
      useNativeDriver: options?.useNativeDriver ?? true,
    }),
  ]);
}

/**
 * Scale In animation (dropdown, pill, or popover entrance)
 */
export function animateScaleIn(
  scale: Animated.Value,
  opacity: Animated.Value,
  options?: MotionOptions & { fromScale?: number }
): Animated.CompositeAnimation {
  scale.setValue(options?.fromScale ?? 0.95);
  opacity.setValue(0);

  return Animated.parallel([
    Animated.timing(opacity, {
      toValue: 1,
      duration: options?.duration ?? mobileMotionDurations.dropdown,
      delay: options?.delay ?? 0,
      easing: options?.easing ?? mobileEasing.default,
      useNativeDriver: options?.useNativeDriver ?? true,
    }),
    Animated.timing(scale, {
      toValue: 1,
      duration: options?.duration ?? mobileMotionDurations.dropdown,
      delay: options?.delay ?? 0,
      easing: options?.easing ?? mobileEasing.default,
      useNativeDriver: options?.useNativeDriver ?? true,
    }),
  ]);
}

/**
 * Slide In animation (drawers, sheets, alerts)
 */
export function animateSlideIn(
  translate: Animated.Value,
  options?: MotionOptions & { from?: number; to?: number }
): Animated.CompositeAnimation {
  const fromVal = options?.from ?? -20;
  const toVal = options?.to ?? 0;
  translate.setValue(fromVal);

  return Animated.timing(translate, {
    toValue: toVal,
    duration: options?.duration ?? mobileMotionDurations.modal,
    delay: options?.delay ?? 0,
    easing: options?.easing ?? mobileEasing.default,
    useNativeDriver: options?.useNativeDriver ?? true,
  });
}

/**
 * Modal Entrance animation
 */
export function animateModalEntrance(
  opacity: Animated.Value,
  translateY: Animated.Value,
  options?: MotionOptions
): Animated.CompositeAnimation {
  opacity.setValue(0);
  translateY.setValue(20);

  return Animated.parallel([
    Animated.timing(opacity, {
      toValue: 1,
      duration: options?.duration ?? mobileMotionDurations.modal,
      delay: options?.delay ?? 0,
      easing: options?.easing ?? mobileEasing.default,
      useNativeDriver: options?.useNativeDriver ?? true,
    }),
    Animated.timing(translateY, {
      toValue: 0,
      duration: options?.duration ?? mobileMotionDurations.modal,
      delay: options?.delay ?? 0,
      easing: options?.easing ?? mobileEasing.default,
      useNativeDriver: options?.useNativeDriver ?? true,
    }),
  ]);
}

/**
 * Tactile button press in / out helper
 */
export function animatePressIn(
  scale: Animated.Value,
  options?: { toScale?: number; duration?: number }
): Animated.CompositeAnimation {
  return Animated.timing(scale, {
    toValue: options?.toScale ?? 0.97,
    duration: options?.duration ?? mobileMotionDurations.micro,
    easing: mobileEasing.default,
    useNativeDriver: true,
  });
}

export function animatePressOut(
  scale: Animated.Value,
  options?: { duration?: number }
): Animated.CompositeAnimation {
  return Animated.timing(scale, {
    toValue: 1,
    duration: options?.duration ?? mobileMotionDurations.hover,
    easing: mobileEasing.default,
    useNativeDriver: true,
  });
}
