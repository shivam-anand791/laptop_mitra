'use client';

import React from 'react';

export interface SkeletonListProps {
  count?: number;
  itemHeight?: string;
  className?: string;
}

export function SkeletonList({ count = 3, itemHeight = 'h-32', className = '' }: SkeletonListProps) {
  return (
    <div className={`space-y-4 ${className}`} aria-busy="true" aria-label="Loading items">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`w-full bg-white rounded-2xl border border-slate-200/80 p-5 ${itemHeight} animate-pulse flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-5 bg-slate-200 rounded-full w-20" />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-200 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="h-3 bg-slate-200 rounded w-1/4" />
            <div className="h-6 bg-slate-200 rounded-lg w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

