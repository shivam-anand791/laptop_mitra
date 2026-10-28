import React from 'react';

export interface AdminErrorStateProps {
  title?: string;
  reason?: string;
  statusCode?: number | string;
  requestId?: string;
  onRetry?: () => void;
  className?: string;
}

export function AdminErrorState({
  title = 'Unable to Load Administrative Data',
  reason,
  statusCode,
  requestId,
  onRetry,
  className = '',
}: AdminErrorStateProps) {
  // Format user-friendly reason if raw server error text was provided
  const cleanReason = React.useMemo(() => {
    if (!reason) return 'A transient error occurred while communicating with the server.';
    if (reason.includes('Cannot GET')) {
      return 'The requested resource or administrative endpoint could not be found.';
    }
    if (reason.includes('Failed to fetch') || reason.includes('NetworkError')) {
      return 'Unable to establish a connection to the backend API service. Please verify your internet connection or backend server status.';
    }
    if (reason.includes('401') || reason.includes('Unauthorized')) {
      return 'Your administrative session has expired or requires re-authentication.';
    }
    if (reason.includes('403') || reason.includes('Forbidden')) {
      return 'You do not have administrative privileges to access this resource.';
    }
    return reason;
  }, [reason]);

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-8 text-center max-w-lg mx-auto ${className}`}
      role="alert"
    >
      <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{cleanReason}</p>

      {(statusCode || requestId) && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-mono text-gray-400 bg-gray-50 py-1 px-2.5 rounded border border-gray-100 max-w-xs mx-auto">
          {statusCode && <span>Status: {statusCode}</span>}
          {statusCode && requestId && <span>·</span>}
          {requestId && <span>Req ID: {requestId.slice(0, 12)}</span>}
        </div>
      )}

      {onRetry && (
        <div className="mt-6">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Retry Request</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminErrorState;
