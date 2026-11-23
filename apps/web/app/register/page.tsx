'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { formatAuthError } from '../../lib/utils';
import { getSafeRedirectUrl } from '../../lib/redirect';
import { auth } from '../../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

type AccountType = 'INDIVIDUAL' | 'CORPORATE';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    register,
    retrySync,
    sendVerificationEmail,
    refreshAuthenticatedUser,
    user,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();

  const redirectParam = searchParams.get('redirect') || searchParams.get('returnUrl');
  const refParam = searchParams.get('ref') || '';

  const [accountType, setAccountType] = useState<AccountType>('INDIVIDUAL');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    gstin: '',
    referralCode: refParam,
    agreedToTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
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
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) {
      setError(null);
      setIsSyncFailure(false);
      setIsEmailInUse(false);
    }
  };

  // Password strength scoring
  const passwordStrength = useMemo(() => {
    const pwd = formData.password;
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[@$!%*?&#^]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  }, [formData.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSyncFailure(false);
    setIsEmailInUse(false);

    if (!formData.name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (accountType === 'CORPORATE') {
      if (!formData.companyName.trim()) {
        setError('Company name is required for corporate registration.');
        return;
      }
      if (formData.gstin.trim() && !GSTIN_REGEX.test(formData.gstin.trim().toUpperCase())) {
        setError('Please enter a valid 15-character Indian GSTIN (e.g. 29ABCDE1234F1Z5).');
        return;
      }
    }

    if (!formData.agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setIsSubmitting(true);

    try {
      const displayName = accountType === 'CORPORATE' && formData.companyName.trim()
        ? `${formData.name.trim()} (${formData.companyName.trim()})`
        : formData.name.trim();

      await register({
        name: displayName,
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        password: formData.password,
        referralCode: formData.referralCode.trim() || undefined,
      });

      try {
        const verification = await sendVerificationEmail();
        if (verification.alreadyVerified) {
          const refreshedUser = await refreshAuthenticatedUser();
          router.replace(getSafeRedirectUrl(redirectParam, refreshedUser.role));
        } else {
          router.replace('/verify-email?sent=1');
        }
      } catch {
        router.replace('/verify-email?sendFailed=1');
      }
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

  const handleGoogleSignUp = async () => {
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
            referralCode: formData.referralCode.trim() || undefined,
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
        setError('Google sign-up is not configured in this environment. Please register using email & password.');
      } else {
        setError(formatAuthError(err));
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleRetrySync = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const displayName = accountType === 'CORPORATE' && formData.companyName.trim()
        ? `${formData.name.trim()} (${formData.companyName.trim()})`
        : formData.name.trim();

      await retrySync({
        name: displayName,
        phone: formData.phone.trim() || undefined,
        referralCode: formData.referralCode.trim() || undefined,
      });
      try {
        const verification = await sendVerificationEmail();
        if (verification.alreadyVerified) {
          const refreshedUser = await refreshAuthenticatedUser();
          router.replace(getSafeRedirectUrl(redirectParam, refreshedUser.role));
        } else {
          router.replace('/verify-email?sent=1');
        }
      } catch {
        router.replace('/verify-email?sendFailed=1');
      }
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

  const hasReferralCode = formData.referralCode.trim().length > 0;

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
        <div className="w-full bg-[#FFFDF9] rounded-[24px] sm:rounded-[32px] border border-[#E6DFD5] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
          
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#071433]/70 text-emerald-300 border border-emerald-400/30 backdrop-blur-md shadow-sm">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{accountType === 'CORPORATE' ? 'Corporate Procurement' : 'Exclusive Member Perks'}</span>
              </div>
            </div>

            {/* Editorial Copy & Benefits - Positioned at lower half so laptop visual stays clear */}
            <div className="relative z-10 space-y-3.5 mt-auto pt-16 pb-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug drop-shadow-md">
                {accountType === 'CORPORATE'
                  ? 'Equip your workforce for less.'
                  : 'Join 25,000+ smart laptop buyers.'}
              </h2>
              <p className="text-xs text-blue-100/90 leading-relaxed font-medium drop-shadow-sm">
                {accountType === 'CORPORATE'
                  ? 'GST input tax credits, bulk pricing, and 32-point certified enterprise laptops with dedicated SLA support.'
                  : 'Create your account in seconds to unlock instant savings, digital warranty certificates, and Mitra affiliate cash.'}
              </p>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2.5 text-xs text-blue-100/95 font-medium">
                  <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center shrink-0 border border-blue-400/40">
                    <svg className="w-3 h-3 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Flat ₹500 First Order Discount with Referral</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-blue-100/95 font-medium">
                  <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center shrink-0 border border-blue-400/40">
                    <svg className="w-3 h-3 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Digital Warranty Vault with Inspection Reports</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-blue-100/95 font-medium">
                  <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center shrink-0 border border-blue-400/40">
                    <svg className="w-3 h-3 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Official GST Invoicing & 18% Input Tax Credits</span>
                </div>
              </div>
            </div>

            {/* Bottom Trust Stamp */}
            <div className="relative z-10 pt-4 border-t border-white/20 flex items-center justify-between text-[11px] text-blue-200/90">
              <span className="font-semibold text-white">450+ Cities Served</span>
              <span className="text-amber-300 font-bold">★★★★★ 4.8/5</span>
            </div>
          </div>

          {/* Right Side: Structured Clean Registration Card */}
          <div className="lg:col-span-7 p-7 sm:p-10 lg:p-12 flex flex-col justify-center bg-[#FFFDF9]">
            <div className="w-full max-w-sm mx-auto space-y-5">
              
              {/* Title & Subtitle */}
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tracking-tight">
                  Create account
                </h1>
                <p className="text-xs text-slate-500">
                  Join LaptopMitra to track orders, warranties, and rewards
                </p>
              </div>

              {/* Account Type Selector (Individual vs Corporate) */}
              <div className="p-1 bg-[#FAF6EF] rounded-xl border border-[#E6DFD5] grid grid-cols-2 gap-1 text-xs font-bold text-slate-700">
                <button
                  type="button"
                  onClick={() => setAccountType('INDIVIDUAL')}
                  className={`py-2 px-3 rounded-lg text-center transition-all cursor-pointer ${
                    accountType === 'INDIVIDUAL'
                      ? 'bg-[#FFFDF9] text-[#2563EB] shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('CORPORATE')}
                  className={`py-2 px-3 rounded-lg text-center transition-all cursor-pointer ${
                    accountType === 'CORPORATE'
                      ? 'bg-[#FFFDF9] text-[#2563EB] shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Business / Corporate
                </button>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                  {isSyncFailure && (
                    <button
                      type="button"
                      onClick={handleRetrySync}
                      disabled={isSubmitting}
                      className="w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs"
                    >
                      {isSubmitting ? 'Completing Setup...' : 'Complete Profile Setup →'}
                    </button>
                  )}
                  {isEmailInUse && (
                    <div className="pt-2 border-t border-rose-200 flex items-center justify-between">
                      <span className="text-[11px] text-rose-800">Already registered?</span>
                      <Link
                        href={loginLinkHref}
                        className="font-bold text-[#2563EB] hover:underline text-xs"
                      >
                        Sign In to this Account →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Form Fields */}
              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    {accountType === 'CORPORATE' ? 'Contact Person Name *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    disabled={isSubmitting || isGoogleSubmitting}
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={accountType === 'CORPORATE' ? 'e.g. Rajesh Sharma' : 'e.g. Priya Patel'}
                    className="h-10.5 w-full px-3.5 py-2 bg-[#FAF6EF] border border-[#E6DFD5] rounded-xl focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:bg-[#FFFDF9] text-slate-900 outline-none transition-colors disabled:opacity-60 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    {accountType === 'CORPORATE' ? 'Business Email Address *' : 'Email Address *'}
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    disabled={isSubmitting || isGoogleSubmitting}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={accountType === 'CORPORATE' ? 'procurement@company.com' : 'you@example.com'}
                    className="h-10.5 w-full px-3.5 py-2 bg-[#FAF6EF] border border-[#E6DFD5] rounded-xl focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:bg-[#FFFDF9] text-slate-900 outline-none transition-colors disabled:opacity-60 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    Mobile Number (Optional)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-xs border-r border-[#E6DFD5] pr-2 pointer-events-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      name="phone"
                      disabled={isSubmitting || isGoogleSubmitting}
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="98765 43210"
                      maxLength={10}
                      className="h-10.5 w-full pl-14 pr-3.5 py-2 bg-[#FAF6EF] border border-[#E6DFD5] rounded-xl font-mono focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:bg-[#FFFDF9] text-slate-900 outline-none transition-colors disabled:opacity-60 text-xs"
                    />
                  </div>
                </div>

                {/* Conditional Corporate Fields */}
                {accountType === 'CORPORATE' && (
                  <div className="space-y-3.5 p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 transition-all">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1 text-xs">
                        Company / Organization Name *
                      </label>
                      <input
                        type="text"
                        name="companyName"
                        required={accountType === 'CORPORATE'}
                        disabled={isSubmitting || isGoogleSubmitting}
                        value={formData.companyName}
                        onChange={handleChange}
                        placeholder="e.g. Acme Technologies Pvt Ltd"
                        className="h-10 w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:border-[#2563EB] text-slate-900 outline-none text-xs"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-800 text-xs">
                          GSTIN (For 18% Input Tax Credit)
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">15 Characters</span>
                      </div>
                      <input
                        type="text"
                        name="gstin"
                        maxLength={15}
                        disabled={isSubmitting || isGoogleSubmitting}
                        value={formData.gstin}
                        onChange={handleChange}
                        placeholder="e.g. 29ABCDE1234F1Z5"
                        className="h-10 w-full px-3 py-2 bg-white border border-blue-200 rounded-lg font-mono uppercase focus:border-[#2563EB] text-slate-900 outline-none text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-xs">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        required
                        minLength={8}
                        disabled={isSubmitting || isGoogleSubmitting}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Min 8 chars"
                        className="h-10.5 w-full px-3 pr-8 py-2 bg-[#FAF6EF] border border-[#E6DFD5] rounded-xl focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:bg-[#FFFDF9] text-slate-900 outline-none text-xs font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-xs">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        required
                        minLength={8}
                        disabled={isSubmitting || isGoogleSubmitting}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Re-enter password"
                        className="h-10.5 w-full px-3 pr-8 py-2 bg-[#FAF6EF] border border-[#E6DFD5] rounded-xl focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:bg-[#FFFDF9] text-slate-900 outline-none text-xs font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-1 pt-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Password strength:</span>
                      <span className="font-bold text-slate-700">{passwordStrength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full flex-1 transition-all rounded-full ${
                            step <= passwordStrength.score ? passwordStrength.color : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Mitra Referral Code (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 text-xs">
                      Mitra Referral Code (Optional)
                    </label>
                    {hasReferralCode && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ₹500 Discount Active
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    name="referralCode"
                    disabled={isSubmitting || isGoogleSubmitting}
                    value={formData.referralCode}
                    onChange={handleChange}
                    placeholder="e.g. MITRA4521"
                    className="h-10 w-full px-3.5 py-2 bg-[#FAF6EF] border border-[#E6DFD5] rounded-xl font-mono uppercase focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:bg-[#FFFDF9] text-slate-900 outline-none text-xs font-semibold"
                  />
                </div>

                {/* Terms and Conditions Consent */}
                <div className="pt-1">
                  <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600 select-none">
                    <input
                      type="checkbox"
                      name="agreedToTerms"
                      checked={formData.agreedToTerms}
                      onChange={handleChange}
                      className="mt-0.5 w-4 h-4 rounded border-[#E6DFD5] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                    />
                    <span>
                      I agree to LaptopMitra&apos;s{' '}
                      <Link href="/terms" target="_blank" className="font-bold text-[#2563EB] hover:underline">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" target="_blank" className="font-bold text-[#2563EB] hover:underline">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                </div>

                {/* Primary Create Account Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="w-full h-11 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-sm transition-all text-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              {/* Social Divider */}
              <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400 my-2" aria-hidden="true">
                <span className="h-px flex-1 bg-[#E6DFD5]" />
                OR
                <span className="h-px flex-1 bg-[#E6DFD5]" />
              </div>

              {/* Google Social Signup */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isSubmitting || isGoogleSubmitting}
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
                    <span>Sign up with Google</span>
                  </>
                )}
              </button>

              {/* Already have an account? Sign In */}
              <div className="pt-2 text-center text-xs text-slate-500">
                Already have an account?{' '}
                <Link href={loginLinkHref} className="font-bold text-[#2563EB] hover:text-[#1D4ED8] hover:underline">
                  Sign In
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F4EE] flex items-center justify-center text-xs font-semibold text-slate-500">Loading registration...</div>}>
      <RegisterForm />
    </Suspense>
  );
}