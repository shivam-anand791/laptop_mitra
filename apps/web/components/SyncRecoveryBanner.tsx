'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/auth-context';

export function SyncRecoveryBanner() {
  const { syncError, retrySync, cancelSyncAndSignOut } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryFailedMsg, setRetryFailedMsg] = useState<string | null>(null);

  if (!syncError) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryFailedMsg(null);
    try {
      await retrySync();
    } catch {
      setRetryFailedMsg('Server database is still unreachable. Please try again shortly or cancel to sign out.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCancel = async () => {
    setRetryFailedMsg(null);
    await cancelSyncAndSignOut();
  };

  return (
    <div
      role="alert"
      className="bg-amber-600 text-white px-4 py-3 shadow-md transition-all sticky top-0 z-50 text-xs sm:text-sm font-medium border-b border-amber-700"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <svg
            className="w-5 h-5 flex-shrink-0 text-amber-200"
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
          <div>
            <span>{syncError.message}</span>
            {retryFailedMsg && (
              <span className="block text-[11px] text-amber-100 font-semibold mt-0.5">
                {retryFailedMsg}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-3.5 py-1.5 rounded-lg bg-white text-amber-900 font-bold hover:bg-amber-50 active:scale-95 transition-all text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            {isRetrying ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-amber-900" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              'Retry Setup'
            )}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isRetrying}
            className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel & Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default SyncRecoveryBanner;

