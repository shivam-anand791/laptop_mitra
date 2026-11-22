export const Platform = {
  OS: 'ios',
  select: <T>(objs: { ios?: T; android?: T; default?: T }): T => objs.ios ?? objs.default as T,
};

export class AnimatedValue {
  constructor(public val: number) {}
  setValue(v: number) {
    this.val = v;
  }
}

export const Animated = {
  Value: AnimatedValue,
  timing: () => ({
    start: (cb?: (result: { finished: boolean }) => void) => cb?.({ finished: true }),
  }),
  parallel: (_anims: unknown[]) => ({
    start: (cb?: (result: { finished: boolean }) => void) => cb?.({ finished: true }),
  }),
  sequence: (_anims: unknown[]) => ({
    start: (cb?: (result: { finished: boolean }) => void) => cb?.({ finished: true }),
  }),
  loop: (_anim: unknown) => ({
    start: (cb?: (result: { finished: boolean }) => void) => cb?.({ finished: true }),
  }),
  delay: (_time: number) => ({
    start: (cb?: (result: { finished: boolean }) => void) => cb?.({ finished: true }),
  }),
};

export const Easing = {
  bezier: (_x1: number, _y1: number, _x2: number, _y2: number) => (t: number) => t,
  linear: (t: number) => t,
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
};

export default {
  Platform,
  Animated,
  Easing,
  StyleSheet,
};
