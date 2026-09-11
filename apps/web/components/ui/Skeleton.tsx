import React from 'react';

/* ── Base skeleton block ── */

interface SkeletonBlockProps {
  className?: string;
  rounded?: string;
}

function SkeletonBlock({ className = '', rounded = 'var(--radius-md)' }: SkeletonBlockProps) {
  return (
    <div
      className={['skeleton-shimmer', className].join(' ')}
      style={{
        background: 'var(--bg-elevated)',
        borderRadius: rounded,
      }}
      aria-hidden="true"
    />
  );
}

/* ── ProductCardSkeleton ── */

export function ProductCardSkeleton() {
  return (
    <div
      className="rounded-[var(--radius-xl)] overflow-hidden border border-[var(--border-default)] bg-[var(--bg-surface)]"
      role="status"
      aria-label="Loading product"
    >
      {/* Image area */}
      <SkeletonBlock className="w-full aspect-[4/3]" rounded="0" />

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <SkeletonBlock className="w-20 h-3" rounded="var(--radius-full)" />
          <SkeletonBlock className="w-12 h-3" rounded="var(--radius-full)" />
        </div>
        <SkeletonBlock className="w-3/4 h-4" />
        <div className="flex gap-1.5">
          <SkeletonBlock className="w-14 h-5" rounded="var(--radius-full)" />
          <SkeletonBlock className="w-16 h-5" rounded="var(--radius-full)" />
          <SkeletonBlock className="w-20 h-5" rounded="var(--radius-full)" />
        </div>
        <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-between items-center">
          <SkeletonBlock className="w-24 h-6" />
          <SkeletonBlock className="w-20 h-9" rounded="var(--radius-md)" />
        </div>
      </div>
    </div>
  );
}

/* ── HeroSkeleton ── */

export function HeroSkeleton() {
  return (
    <div
      className="w-full py-20 px-4"
      role="status"
      aria-label="Loading homepage"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left content */}
        <div className="lg:col-span-7 space-y-6">
          <SkeletonBlock className="w-48 h-6" rounded="var(--radius-full)" />
          <div className="space-y-3">
            <SkeletonBlock className="w-full h-12" />
            <SkeletonBlock className="w-4/5 h-12" />
            <SkeletonBlock className="w-3/5 h-12" />
          </div>
          <SkeletonBlock className="w-full h-5" />
          <SkeletonBlock className="w-4/5 h-5" />
          <div className="flex gap-4 pt-2">
            <SkeletonBlock className="w-44 h-12" rounded="var(--radius-xl)" />
            <SkeletonBlock className="w-40 h-12" rounded="var(--radius-xl)" />
          </div>
          <div className="flex gap-8 pt-6">
            <SkeletonBlock className="w-20 h-12" />
            <SkeletonBlock className="w-20 h-12" />
            <SkeletonBlock className="w-20 h-12" />
          </div>
        </div>

        {/* Right card */}
        <div className="lg:col-span-5">
          <SkeletonBlock className="w-full rounded-[var(--radius-2xl)] h-80" />
        </div>
      </div>
    </div>
  );
}

/* ── SpecTableSkeleton ── */

export function SpecTableSkeleton() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-label="Loading specifications"
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)]">
          <SkeletonBlock className="w-28 h-4" />
          <SkeletonBlock className="w-36 h-4" />
        </div>
      ))}
    </div>
  );
}

/* ── CartSkeleton ── */

export function CartSkeleton() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-label="Loading cart"
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex gap-4 p-4 rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-surface)]"
        >
          <SkeletonBlock className="w-20 h-20 rounded-[var(--radius-md)] shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="w-3/4 h-4" />
            <SkeletonBlock className="w-1/2 h-3" />
            <div className="flex justify-between items-center pt-2">
              <SkeletonBlock className="w-24 h-5" />
              <SkeletonBlock className="w-24 h-8" rounded="var(--radius-md)" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── StatsSkeleton ── */

export function StatsSkeleton() {
  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      role="status"
      aria-label="Loading statistics"
    >
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="p-5 rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-surface)]"
        >
          <SkeletonBlock className="w-16 h-3 mb-3" rounded="var(--radius-full)" />
          <SkeletonBlock className="w-24 h-8 mb-2" />
          <SkeletonBlock className="w-20 h-3" />
        </div>
      ))}
    </div>
  );
}

/* ── TableSkeleton ── */

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden"
      role="status"
      aria-label="Loading data"
    >
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-[var(--border-default)]">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonBlock key={i} className="flex-1 h-3" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 p-4 border-b border-[var(--border-subtle)] last:border-b-0"
        >
          {[1, 2, 3, 4, 5].map((j) => (
            <SkeletonBlock key={j} className="flex-1 h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}
