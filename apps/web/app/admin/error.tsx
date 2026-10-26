'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Button from '../../components/ui/Button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled admin segment error:', error);
  }, [error]);

  return (
    <div className="min-h-[500px] flex items-center justify-center p-6">
      <div className="card max-w-md w-full p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto text-2xl font-bold">
          ⚠️
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Administrative Error
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            An unexpected error occurred while processing this administrative view.
          </p>
          {error?.message && (
            <p className="text-xs font-mono bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-2.5 rounded-lg mt-3 text-left overflow-x-auto">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center space-x-3 pt-2">
          {reset && (
            <Button variant="primary" size="sm" onClick={() => reset()}>
              Try Again
            </Button>
          )}
          <Link href="/admin" className="btn btn-secondary text-xs">
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
