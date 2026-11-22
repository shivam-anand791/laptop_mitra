'use client';

import React, { useEffect, useState } from 'react';
import { useIntersectionObserver } from '../lib/hooks/useIntersectionObserver';
import { useReducedMotion } from '../lib/hooks/useReducedMotion';

interface AnimatedCounterProps {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

export default function AnimatedCounter({
  target,
  prefix = '',
  suffix = '',
  duration = 1800,
  className = '',
}: AnimatedCounterProps) {
  const [current, setCurrent] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const [ref, isIntersecting] = useIntersectionObserver<HTMLSpanElement>({
    threshold: 0.2,
    triggerOnce: true,
  });

  useEffect(() => {
    if (prefersReducedMotion) {
      setCurrent(target);
      return;
    }

    if (isIntersecting && !hasAnimated) {
      setHasAnimated(true);
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCurrent(Math.round(eased * target));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [isIntersecting, hasAnimated, target, duration, prefersReducedMotion]);

  return (
    <span
      ref={ref}
      className={`inline-block font-mono font-bold tabular-nums tracking-tight ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
      aria-label={`${prefix}${target}${suffix}`}
    >
      {prefix}
      {prefersReducedMotion ? target.toLocaleString('en-IN') : current.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}
