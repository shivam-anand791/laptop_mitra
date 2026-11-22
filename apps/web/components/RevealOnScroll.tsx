'use client';

import React from 'react';
import { useIntersectionObserver } from '../lib/hooks/useIntersectionObserver';
import { useReducedMotion } from '../lib/hooks/useReducedMotion';

interface RevealOnScrollProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  durationMs?: number;
  direction?: 'up' | 'none';
  as?: React.ElementType;
}

/**
 * Reusable viewport reveal container using IntersectionObserver.
 * - Animates once upon entering viewport (triggerOnce: true).
 * - Calibrated with LaptopMitra cubic-bezier(0.16, 1, 0.3, 1).
 * - Full fallback for prefers-reduced-motion.
 */
export default function RevealOnScroll({
  children,
  className = '',
  delayMs = 0,
  durationMs = 500,
  direction = 'up',
  as: Component = 'div',
}: RevealOnScrollProps) {
  const prefersReducedMotion = useReducedMotion();
  const [ref, isIntersecting] = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    triggerOnce: true,
  });

  if (prefersReducedMotion) {
    return <Component className={className}>{children}</Component>;
  }

  const translate = direction === 'up' ? 'translate3d(0, 16px, 0)' : 'none';

  return (
    <Component
      ref={ref}
      className={className}
      style={{
        opacity: isIntersecting ? 1 : 0,
        transform: isIntersecting ? 'translate3d(0, 0, 0)' : translate,
        transition: `opacity ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, transform ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
        willChange: isIntersecting ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </Component>
  );
}
