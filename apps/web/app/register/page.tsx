'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomerLayout from '../../components/CustomerLayout';
import { useAuth } from '../../lib/auth-context';
import { formatAuthError } from '../../lib/utils';
import { getSafeRedirectUrl } from '../../lib/redirect';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, retrySync, user, isAuthenticated, isLoading: authLoading } = useAuth();

  const redirectParam = searchParams.get('redirect') || searchParams.get('returnUrl');
  const refParam = searchParams.get('ref') || '';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    referralCode: refParam,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncFailure, setIsSyncFailure] = useState(false);
  const [isEmailInUse, setIsEmailInUse] = useState(false);

  // If already authenticated with an authoritative non-guest account, redirect immediately
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !user.isGuest) {
      const destination = getSafeRedirectUrl(redirectParam, user.role);
      router.replace(destination);
    }
  }, [authLoading, isAuthenticated, user, redirectParam, router]);

  // Sync ref param if passed
  useEffect(() => {
    if (refParam) {
      setFormData((prev) => ({ ...prev, referralCode: refParam.toUpperCase() }));
    }
  }, [refParam]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) {
      setError(null);
      setIsSyncFailure(false);
      setIsEmailInUse(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSyncFailure(false);
    setIsEmailInUse(false);
    setIsSubmitting(true);

    try {
      const syncedUser = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        password: formData.password,
        referralCode: formData.referralCode.trim() || undefined,
      });

      // Successful registration & authoritative backend sync: redirect to destination
      const destination = getSafeRedirectUrl(redirectParam, syncedUser.role);
      router.replace(destination);
    } catch (err: any) {
      if (err?.isSyncFailure) {
        setIsSyncFailure(true);
        setError('Your account was created, but completing profile setup failed. Click "Complete Setup" to retry.');
      } else {
        const msg = formatAuthError(err);
        setError(msg);
        if (
          err?.code === 'auth/email-already-in-use' ||
          msg.toLowerCase().includes('already exists') ||
          msg.toLowerCase().includes('already in use')
        ) {
          setIsEmailInUse(true);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetrySync = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const syncedUser = await retrySync({
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        referralCode: formData.referralCode.trim() || undefined,
      });
      const destination = getSafeRedirectUrl(redirectParam, syncedUser.role);
      router.replace(destination);
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginLinkHref = `/login?${new URLSearchParams({
    ...(formData.email ? { email: formData.email.trim() } : {}),
    ...(redirectParam ? { redirect: redirectParam } : {}),
  }).toString()}`;

  return (
    <div className="bg-[#F8FAFC] min-h-[80vh] flex items-center justify-center py-12 sm:py-16 px-4">
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
            Create Account
          </h1>
          <p className="text-xs text-slate-500">
            Join LaptopMitra to track laptop warranties, order status, and Mitra affiliate earnings.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 space-y-3">
            <p className="font-semibold">{error}</p>
            {isSyncFailure && (
              <button
                type="button"
                onClick={handleRetrySync}
                disabled={isSubmitting}
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs"
              >
                {isSubmitting ? 'Completing Setup...' : 'Complete Profile Setup →'}
              </button>
            )}
            {isEmailInUse && (
              <div className="pt-2 border-t border-rose-200 flex items-center justify-between">
                <span className="text-[11px] text-rose-800">Already registered?</span>
                <Link
                  href={loginLinkHref}
                  className="inline-block font-bold text-[#1D6FF2] hover:underline text-xs"
                >
                  Sign In to this Account →
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              required
              disabled={isSubmitting}
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Priya Patel"
              className="h-11 w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl focus:border-[#1D6FF2] focus:bg-white text-slate-900 outline-none transition-colors disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              required
              disabled={isSubmitting}
              value={formData.email}
              onChange={handleChange}
              placeholder="you@company.com"
              className="h-11 w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl focus:border-[#1D6FF2] focus:bg-white text-slate-900 outline-none transition-colors disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Mobile Number (For Express Delivery SMS)
            </label>
            <input
              type="tel"
              name="phone"
              disabled={isSubmitting}
              value={formData.phone}
              onChange={handleChange}
              placeholder="10-digit mobile number"
              className="h-11 w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl font-mono focus:border-[#1D6FF2] focus:bg-white text-slate-900 outline-none transition-colors disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                minLength={6}
                disabled={isSubmitting}
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
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

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Friend&apos;s Mitra Referral Code (Optional)
            </label>
            <input
              type="text"
              name="referralCode"
              disabled={isSubmitting}
              value={formData.referralCode}
              onChange={handleChange}
              placeholder="e.g. MITRA4521"
              className="h-11 w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl font-mono uppercase focus:border-[#1D6FF2] focus:bg-white text-slate-900 outline-none transition-colors disabled:opacity-60"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Applying a referral code gives you ₹500 instant discount on your first laptop purchase.
            </span>
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
                Creating Account & Signing In...
              </>
            ) : (
              'Create Account & Start Shopping'
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-[#E4E9F2] text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link href={loginLinkHref} className="font-bold text-[#1D6FF2] hover:underline">
            Sign in here →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <CustomerLayout>
      <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center text-xs font-semibold text-slate-500">Loading registration...</div>}>
        <RegisterForm />
      </Suspense>
    </CustomerLayout>
  );
}
