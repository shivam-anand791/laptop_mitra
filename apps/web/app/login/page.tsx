'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomerLayout from '../../components/CustomerLayout';
import { useAuth } from '../../lib/auth-context';
import { formatAuthError } from '../../lib/utils';
import { getSafeRedirectUrl } from '../../lib/redirect';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, guestLogin, user, isAuthenticated, isLoading: authLoading } = useAuth();

  const redirectParam = searchParams.get('redirect') || searchParams.get('returnUrl');
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated with a real account, redirect to destination
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !user.isGuest) {
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
      const destination = getSafeRedirectUrl(redirectParam, syncedUser.role);
      router.replace(destination);
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
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
      const destination = getSafeRedirectUrl(redirectParam, syncedUser.role);
      router.replace(destination);
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const registerLinkHref = `/register${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`;

  return (
    <div className="bg-[#F8FAFC] min-h-[75vh] flex items-center justify-center py-12 sm:py-16 px-4">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-[#E4E9F2] shadow-sm space-y-6">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block transition-opacity hover:opacity-90">
            <Image
              src="/logo.png"
              alt="LaptopMitra"
              width={180}
              height={60}
              className="h-10 sm:h-11 w-auto mx-auto object-contain"
              priority
            />
          </Link>
          <h1 className="text-2xl font-black text-[#0B1F4B] tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs text-slate-500">
            Sign in to manage your laptop orders, warranty certificates, and Mitra affiliate earnings.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              disabled={isSubmitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="h-11 w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl focus:border-[#1D6FF2] focus:bg-white text-slate-900 outline-none transition-colors disabled:opacity-60"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700">
                Password
              </label>
              <span className="text-[11px] font-semibold text-[#1D6FF2] hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isSubmitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl focus:border-[#1D6FF2] focus:bg-white text-slate-900 outline-none transition-colors pr-10 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-1"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 px-4 bg-[#1D6FF2] hover:bg-[#1558C0] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Signing In...
              </>
            ) : (
              'Sign In to LaptopMitra'
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400" aria-hidden="true">
          <span className="h-px flex-1 bg-[#E4E9F2]" />
          OR
          <span className="h-px flex-1 bg-[#E4E9F2]" />
        </div>

        <button
          type="button"
          onClick={handleGuestLogin}
          disabled={isSubmitting}
          className="w-full h-11 px-4 border border-[#1D6FF2] text-[#1D6FF2] hover:bg-blue-50 disabled:opacity-50 font-bold rounded-xl transition-colors text-xs cursor-pointer flex items-center justify-center"
        >
          {isSubmitting ? 'Starting Guest Session...' : 'Continue as Guest'}
        </button>

        {/* Quick Demo Fill */}
        <div className="pt-1">
          <button
            type="button"
            onClick={fillDemo}
            disabled={isSubmitting}
            className="w-full h-10 px-4 bg-[#F8FAFC] border border-[#E4E9F2] hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50"
          >
            ⚡ Quick Fill Demo Account
          </button>
        </div>

        <div className="pt-4 border-t border-[#E4E9F2] text-center text-xs text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href={registerLinkHref} className="font-bold text-[#1D6FF2] hover:underline">
            Create free account →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <CustomerLayout>
      <Suspense fallback={<div className="min-h-[75vh] flex items-center justify-center text-xs font-semibold text-slate-500">Loading sign in...</div>}>
        <LoginForm />
      </Suspense>
    </CustomerLayout>
  );
}
