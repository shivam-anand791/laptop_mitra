'use client';

import React from 'react';
import Button from './Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorState({
  title = 'Something went wrong',
  description = 'An unexpected error occurred while loading this data. Please try again.',
  error,
  onRetry,
  className = '',
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : null;

  return (
    <div
      role="alert"
      className={[
        'flex flex-col items-center justify-center p-8 text-center rounded-2xl',
        'bg-white border border-[#E2E8F0] shadow-xs max-w-md mx-auto my-6',
        className,
      ].join(' ')}
    >
      <div className="w-12 h-12 rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center mb-4 border border-[#FECACA]">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <h3 className="text-base font-bold text-[#111827] mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-[#475569] max-w-sm mb-4 leading-relaxed">{description}</p>

      {errorMessage && (
        <pre className="text-[11px] font-mono text-[#DC2626] bg-[#FEF2F2] p-2.5 rounded-lg mb-4 max-w-full overflow-x-auto text-left border border-[#FECACA]">
          {errorMessage}
        </pre>
      )}

      {onRetry && (
        <Button
          variant="primary"
          size="sm"
          onClick={onRetry}
          icon={
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        >
          Try Again
        </Button>
      )}
    </div>
  );
}
