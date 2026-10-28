'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';

export interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verifiedRole, setVerifiedRole] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    // 1. While Firebase auth state is still resolving, keep verifying
    if (authLoading) return;

    // 2. Unauthenticated: redirect immediately to login with return path
    if (!isAuthenticated) {
      router.replace('/login?next=/admin');
      return;
    }

    // 3. Authenticated: verify role against authoritative backend GET /auth/profile
    let active = true;

    async function verifyAuthoritativeProfile() {
      try {
        const profile = await api.getProfile();
        if (!active) return;

        if ((profile?.role === 'ADMIN' || profile?.role === 'SUPPORT') && profile?.status === 'ACTIVE') {
          setVerifiedRole(profile.role);
          setIsForbidden(false);
        } else {
          setVerifiedRole(profile?.role || 'CUSTOMER');
          setIsForbidden(true);
        }
      } catch (err: any) {
        if (!active) return;
        if (err?.status === 401) {
          router.replace('/login?next=/admin');
        } else {
          // Any profile fetch failure strictly denies access to prevent client-side localStorage spoofing
          setIsForbidden(true);
        }
      } finally {
        if (active) {
          setIsVerifying(false);
        }
      }
    }

    verifyAuthoritativeProfile();

    // Listen for global 403 events from any admin api call
    const handleForbiddenEvent = () => {
      setIsForbidden(true);
    };
    window.addEventListener('admin:forbidden', handleForbiddenEvent);

    return () => {
      active = false;
      window.removeEventListener('admin:forbidden', handleForbiddenEvent);
    };
  }, [authLoading, isAuthenticated, user, router]);

  // Loading Skeleton State: matches the Admin Layout shape to prevent layout flash
  if (authLoading || isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col lg:flex-row">
        {/* Sidebar Skeleton */}
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 space-y-6 hidden lg:block animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4"></div>
          <div className="space-y-3 pt-4">
            <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </aside>

        {/* Content Skeleton */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between animate-pulse">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            <div className="flex items-center gap-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            </div>
          </header>
          <main className="p-6 space-y-6 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
              <div className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
              <div className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
              <div className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            </div>
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
          </main>
        </div>
      </div>
    );
  }

  // Not signed in: redirecting
  if (!isAuthenticated) {
    return null;
  }

  // 403 Forbidden State: styled consistently with the storefront EmptyState
  const effectiveRole = verifiedRole || user?.role || 'CUSTOMER';
  const isSupportRole = effectiveRole === 'SUPPORT';
  const isSupportPath = pathname.startsWith('/admin/support') || pathname.startsWith('/admin/returns');
  const isSupportRestricted = isSupportRole && !isSupportPath;

  if (isForbidden || (effectiveRole !== 'ADMIN' && effectiveRole !== 'SUPPORT') || isSupportRestricted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-6 text-center rounded-2xl bg-white dark:bg-gray-800 border border-[#E2E8F0] dark:border-gray-700 shadow-xs max-w-md w-full">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-[#FEF2F2] dark:bg-red-950/40 text-[#DC2626] dark:text-red-400 flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-lg sm:text-xl font-bold text-[#111827] dark:text-white tracking-tight mb-2">
            403 — Administrator Access Required
          </h3>

          {/* Description */}
          <p className="text-xs sm:text-sm text-[#475569] dark:text-gray-400 max-w-sm mb-6 leading-relaxed">
            {isSupportRestricted ? (
              <>
                Your authenticated account ({user?.email || 'user'}) is registered with role{' '}
                <span className="font-semibold text-gray-800 dark:text-gray-200">SUPPORT</span>.
                Access to general administrator modules is restricted.
              </>
            ) : (
              <>
                Your authenticated account ({user?.email || 'user'}) is registered with the role{' '}
                <span className="font-semibold text-gray-800 dark:text-gray-200">{effectiveRole}</span>{' '}
                and does not have administrator privileges.
              </>
            )}
          </p>

          {/* Actions */}
          <div className="space-y-3 w-full">
            {isSupportRestricted && (
              <Link
                href="/admin/support"
                className="inline-flex items-center justify-center w-full min-h-[44px] px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-xs active:scale-98 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Go to Support Tickets →
              </Link>
            )}
            <Link
              href="/"
              className={`inline-flex items-center justify-center w-full min-h-[44px] px-6 rounded-xl ${
                isSupportRestricted
                  ? 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
              } text-sm font-semibold shadow-xs active:scale-98 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
            >
              ← Back to Store
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.replace('/login?next=/admin');
              }}
              className="inline-flex items-center justify-center w-full min-h-[40px] px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Sign In with a Different Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verified ADMIN session: render children
  return <>{children}</>;
}

export default AdminGuard;
