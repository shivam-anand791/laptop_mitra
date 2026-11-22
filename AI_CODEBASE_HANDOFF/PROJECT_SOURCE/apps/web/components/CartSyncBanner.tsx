'use client';

import React from 'react';
import { useCart } from '../lib/cart-context';

export function CartSyncBanner() {
  const { syncError, isSyncing, retrySync } = useCart();

  if (!syncError) return null;

  return (
    <div
      role="alert"
      data-testid="cart-sync-error-banner"
      className="bg-rose-50 border-b border-rose-200 text-rose-900 px-4 py-3 text-xs sm:text-sm"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <svg
            className="w-5 h-5 shrink-0 text-rose-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="font-medium">{syncError}</span>
        </div>
        <button
          type="button"
          onClick={() => void retrySync()}
          disabled={isSyncing}
          className="px-4 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs transition-all cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
        >
          {isSyncing ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    </div>
  );
}

