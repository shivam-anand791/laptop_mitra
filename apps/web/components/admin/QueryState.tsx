'use client';

import React from 'react';
import Button from '../ui/Button';

export interface QueryStateProps {
  isLoading: boolean;
  error?: Error | unknown | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  loadingRows?: number;
  loadingType?: 'table' | 'cards' | 'stats';
  children: React.ReactNode;
}

export function QueryState({
  isLoading,
  error,
  isEmpty = false,
  onRetry,
  emptyTitle = 'No records found',
  emptyMessage = 'There is currently no data to display for this view.',
  emptyAction,
  loadingRows = 5,
  loadingType = 'table',
  children,
}: QueryStateProps) {
  // 1. Loading State
  if (isLoading) {
    if (loadingType === 'stats') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      );
    }

    if (loadingType === 'cards') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4"
            >
              <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      );
    }

    // Default: Table skeleton
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex gap-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700 p-2">
          {Array.from({ length: loadingRows }).map((_, i) => (
            <div key={i} className="py-4 px-3 flex gap-4 items-center">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    const errorMsg =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Failed to load administrative data.';

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-900/50 p-8 text-center my-6 max-w-lg mx-auto shadow-xs">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
          ⚠️
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
          Failed to load administrative data
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">{errorMsg}</p>
        {onRetry && (
          <Button variant="primary" size="sm" onClick={onRetry}>
            Retry Request
          </Button>
        )}
      </div>
    );
  }

  // 3. Empty State
  if (isEmpty) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center my-6">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-400 flex items-center justify-center mx-auto mb-4 text-xl">
          📂
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">{emptyTitle}</h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
          {emptyMessage}
        </p>
        {emptyAction && <div className="mt-2">{emptyAction}</div>}
      </div>
    );
  }

  // 4. Render Content
  return <>{children}</>;
}

export default QueryState;
