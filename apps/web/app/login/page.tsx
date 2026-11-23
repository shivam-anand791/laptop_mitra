'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { formatAuthError } from '../../lib/utils';
import { getSafeRedirectUrl, canAccessPath, getDefaultRoleDestination } from '../../lib/redirect';
import { auth } from '../../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    login,
    guestLogin,
    user,
    isAuthenticated,
    isLoading: authLoading,
    logout,
    syncError,
    retrySync,
    cancelSyncAndSignOut,
  } = useAuth();

  const redirectParam =
    searchParams.get('next') ||
    searchParams.get('redirect') ||
    searchParams.get('returnUrl');
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isRetryingSync, setIsRetryingSync] = useState(false);

  // If already authenticated with a real account, redirect to destination
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !user.isGuest) {
      if (redirectParam && !canAccessPath(redirectParam, user.role)) {
        return;
      }
      const destination = getSafeRedirectUrl(redirectParam, user.role);
      router.replace(destination);
    }
  }, [authLoading, isAuthenticated, user, redirectParam, router]);

  useEffect(() => {
    if (emailParam && !email) {
      setEmail(emailParam);
    }
  }, [emailParam, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const syncedUser = await login(email, password);
      
      if (redirectParam && !canAccessPath(redirectParam, syncedUser.role)) {
        return;
      }
      const destination = getSafeRedirectUrl(redirectParam, syncedUser.role);
      router.replace(destination);
    } catch (err: any) {
      if (err?.isSyncFailure) {
        setError(null);
      } else {
        setError(formatAuthError(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(auth, provider);
      if (credential.user) {
        const token = await credential.user.getIdToken();
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: credential.user.displayName || undefined,
          }),
        }).catch(() => null);

        const data = res && res.ok ? await res.json().catch(() => null) : null;
        const role = data?.user?.role || 'CUSTOMER';
        const destination = getSafeRedirectUrl(redirectParam, role);
        router.replace(destination);
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') return;
      if (err?.code === 'auth/configuration-not-found' || err?.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled in this environment. Please sign in with email & password.');
      } else {
        setError(formatAuthError(err));
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleInFormRetrySync = async () => {
    setIsRetryingSync(true);
    setError(null);
    try {
      const syncedUser = await retrySync();
      
      if (redirectParam && !canAccessPath(redirectParam, syncedUser.role)) {
        return;
      }
      const destination = getSafeRedirectUrl(redirectParam, syncedUser.role);
      router.replace(destination);
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setIsRetryingSync(false);
    }
  };

  const fillDemo = () => {
    setEmail('customer@laptopmitra.com');
    setPassword('Mitra@2026!');
  };

  const handleGuestLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const syncedUser = await guestLogin();
      if (redirectParam && !canAccessPath(redirectParam, syncedUser.role)) {
        return;
      }
      const destination = getSafeRedirectUrl(redirectParam, syncedUser.role);
      router.replace(destination);
    } catch (err: any) {
      if (err?.isSyncFailure) {
        setError(null);
      } else {
        setError(formatAuthError(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const registerLinkHref = `/register${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`;

  // 403 Forbidden State: Authenticated user lacks permission for the requested destination
  if (
    !authLoading &&
    isAuthenticated &&
    user &&
    !user.isGuest &&
    redirectParam &&
    !canAccessPath(redirectParam, user.role)
  ) {
    return (
      <div className="min-h-screen bg-[#F7F4EE] flex flex-col justify-between p-4 sm:p-6">
        <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-4">
          <Link href="/" className="inline-block transition-opacity hover:opacity-90">
            <Image
              src="/logo.png"
              alt="LaptopMitra"
              width={150}
              height={44}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-600 hover:text-[#2563EB] flex items-center gap-1.5 transition-colors"
          >
            <span>← Back to Store</span>
          </Link>
        </header>

        <div className="max-w-md w-full bg-[#FFFDF9] p-8 sm:p-10 rounded-3xl border border-rose-200 shadow-sm space-y-6 text-center mx-auto my-auto">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">403 — Access Restricted</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              You are signed in as <strong>{user.email || 'user'}</strong> ({user.role}). Your account lacks permission to access <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-[11px]">{redirectParam}</code>.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <Link
              href={getDefaultRoleDestination(user.role)}
              className="w-full h-11 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl shadow-sm transition-all text-xs flex items-center justify-center"
            >
              Go to Your Dashboard ({getDefaultRoleDestination(user.role)}) →
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
              }}
              className="w-full h-11 px-4 border border-[#E6DFD5] hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors text-xs flex items-center justify-center cursor-pointer"
            >
              Sign Out & Switch Account
            </button>
          </div>
        </div>

        <footer className="text-center text-[11px] text-slate-400 py-4">
          © 2026 LaptopMitra. All rights reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col justify-between">
      {/* Minimal Distraction-Free Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between">
        <Link href="/" className="inline-block transition-opacity hover:opacity-90">
          <Image
            src="/logo.png"
            alt="LaptopMitra"
            width={160}
            height={46}
            className="h-8 sm:h-9 w-auto object-contain"
            priority
          />
        </Link>
        <Link
          href="/"
          className="text-xs font-semibold text-slate-600 hover:text-[#2563EB] flex items-center gap-1.5 transition-colors bg-[#FFFDF9] border border-[#E6DFD5] px-3.5 py-2 rounded-xl shadow-2xs hover:bg-[#FAF6EF]"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Store</span>
        </Link>
      </header>

      {/* Main Full-Screen Centered Dual-Pane Container */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 my-auto py-6 sm:py-8 flex items-center justify-center">
        <div className="w-full bg-[#FFFDF9] rounded-[24px] sm:rounded-[32px] border border-[#E6DFD5] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
          
          {/* Left Side: Brand Visual Panel with Premium Laptop Imagery & Gradient Overlay */}
          <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-8 sm:p-9 text-white overflow-hidden bg-[#071433]">
            {/* Background Photographic Representation of Premium Enterprise Laptop */}
            <Image
              src="/images/generated/hero-enterprise-laptop-mobile.jpg"
              alt="Certified Refurbished Laptop"
              fill
              priority
              className="object-cover object-top brightness-125 contrast-115 saturate-125 pointer-events-none"
            />

            {/* Glowing Ambient Cyan/Blue Rim-Light Highlight */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-56 h-56 bg-blue-500/35 rounded-full blur-3xl pointer-events-none" />

            {/* Smooth Bottom Gradient Overlay (Leaves top 50% completely open and crystal clear) */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#071433] from-35% via-[#071433]/75 via-60% to-transparent pointer-events-none" />

            {/* Top Brand Pill */}
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#071433]/70 text-blue-200 border border-blue-400/30 backdrop-blur-md shadow-sm">
                <svg className="w-3.5 h-3.5 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Certified Tech Retail</span>
              </div>
            </div>

            {/* Editorial Headline & Value Propositions - Positioned at lower half so laptop visual stays clear */}
            <div className="relative z-10 space-y-3.5 mt-auto pt-16 pb-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug drop-shadow-md">
                Smarter certified tech starts here.
              </h2>
              <p className="text-xs text-blue-100/90 leading-relaxed font-medium drop-shadow-sm">
                Every refurbished laptop is bench-tested through our rigorous 32-point diagnostics with up to 1-year pan-India doorstep warranty.
              </p>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2.5 text-xs text-blue-100/95 font-medium">
                  <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center shrink-0 border border-blue-400/40">
                    <svg className="w-3 h-3 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>32-Point Quality Hardware Verification</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-blue-100/95 font-medium">
                  <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center shrink-0 border border-blue-400/40">
                    <svg className="w-3 h-3 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>6–12 Month Comprehensive Doorstep Warranty</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-blue-100/95 font-medium">
                  <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center shrink-0 border border-blue-400/40">
                    <svg className="w-3 h-3 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Insured Doorstep Pan-India Courier Delivery</span>
                </div>
              </div>
            </div>

            {/* Bottom Social Proof / Trust Footnote */}
            <div className="relative z-10 pt-4 border-t border-white/20 flex items-center justify-between text-[11px] text-blue-200/90">
              <span className="font-semibold text-white">25,000+ Verified Buyers</span>
              <span className="text-amber-300 font-bold">★★★★★ 4.8/5</span>
            </div>
          </div>

          {/* Right Side: Clean Modern Form Card */}
          <div className="lg:col-span-7 p-7 sm:p-10 lg:p-12 flex flex-col justify-center bg-[#FFFDF9]">
            <div className="w-full max-w-sm mx-auto space-y-6">
              
              {/* Title & Subtitle */}
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tracking-tight">
                  Welcome back
                </h1>
                <p className="text-xs text-slate-500">
                  Enter your email and password to access your account
                </p>
              </div>

              {/* Transient Sync Error Recovery Card */}
              {syncError && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="font-semibold leading-relaxed">{syncError.message}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleInFormRetrySync}
                      disabled={isRetryingSync || isSubmitting}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs disabled:opacity-50"
                    >
                      {isRetryingSync ? 'Retrying...' : 'Retry Setup'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await cancelSyncAndSignOut();
                      }}
                      disabled={isRetryingSync || isSubmitting}
                      className="px-2.5 py-1 border border-amber-300 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg transition-colors cursor-pointer text-xs disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Form Error Banner */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-start gap-2">
                  <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Email & Password Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 text-xs">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    disabled={isSubmitting || isGoogleSubmitting || isRetryingSync}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="h-11 w-full px-3.5 py-2.5 bg-[#FAF6EF] border border-[#E6DFD5] rounded-xl focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:bg-[#FFFDF9] text-slate-900 outline-none transition-colors disabled:opacity-60 text-xs font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-700 text-xs">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline cursor-pointer"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      disabled={isSubmitting || isGoogleSubmitting || isRetryingSync}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 w-full px-3.5 pr-10 py-2.5 bg-[#FAF6EF] border border-[#E6DFD5] rounded-xl focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:bg-[#FFFDF9] text-slate-900 outline-none transition-colors disabled:opacity-60 text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me Toggle */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#E6DFD5] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>
                </div>

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || isGoogleSubmitting || isRetryingSync}
                  className="w-full h-11 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-sm transition-all text-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              {/* Social Divider */}
              <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400 my-2" aria-hidden="true">
                <span className="h-px flex-1 bg-[#E6DFD5]" />
                OR
                <span className="h-px flex-1 bg-[#E6DFD5]" />
              </div>

              {/* Google Social Login */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || isGoogleSubmitting || isRetryingSync}
                className="w-full h-11 px-4 border border-[#E6DFD5] bg-[#FFFDF9] hover:bg-[#FAF6EF] text-slate-700 font-bold rounded-xl transition-colors text-xs cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {isGoogleSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-[#2563EB]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Connecting Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Quick Demo & Guest Helpers */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  disabled={isSubmitting || isGoogleSubmitting || isRetryingSync}
                  className="h-9 px-2 border border-[#E6DFD5] hover:bg-[#FAF6EF] text-slate-700 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span>Guest Session</span>
                </button>

                <button
                  type="button"
                  onClick={fillDemo}
                  disabled={isSubmitting || isGoogleSubmitting || isRetryingSync}
                  className="h-9 px-2 bg-[#FAF6EF] border border-[#E6DFD5] hover:bg-[#F2ECE2] text-slate-700 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span className="text-amber-500 font-bold">⚡</span>
                  <span>Demo Account</span>
                </button>
              </div>

              {/* Sign Up Link */}
              <div className="pt-2 text-center text-xs text-slate-500">
                Don&apos;t have an account?{' '}
                <Link href={registerLinkHref} className="font-bold text-[#2563EB] hover:text-[#1D4ED8] hover:underline">
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-[#E6DFD5]/60 gap-2">
        <span>© 2026 LaptopMitra. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-slate-800">Privacy Policy</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-slate-800">Terms of Service</Link>
          <span>•</span>
          <span className="flex items-center gap-1 text-slate-500">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            256-Bit SSL Encrypted
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F4EE] flex items-center justify-center text-xs font-semibold text-slate-500">Loading sign in...</div>}>
      <LoginForm />
    </Suspense>
  );
}