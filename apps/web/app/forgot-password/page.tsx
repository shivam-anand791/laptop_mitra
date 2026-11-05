'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CustomerLayout from '../../components/CustomerLayout';
import { api } from '../../lib/api';
import { auth, sendPasswordResetEmail } from '../../lib/firebase';
import { validatePassword } from '../reset-password/page';

const COOLDOWN_SECONDS = 60;

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [local, domain] = parts;
  if (local.length <= 1) return `*@${domain}`;
  if (local.length === 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

type ViewMode = 'request' | 'link-sent' | 'otp-code' | 'set-password' | 'success';

export default function ForgotPasswordPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('request');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [grantToken, setGrantToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendLink = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      try {
        await api.forgotPassword(cleanEmail);
      } catch (apiErr: any) {
        if (apiErr?.status === 404 || apiErr?.status === 0 || apiErr?.message?.includes('Cannot POST')) {
          const continueOrigin =
            typeof window !== 'undefined' ? window.location.origin : 'https://laptop-mitra.vercel.app';
          await sendPasswordResetEmail(auth, cleanEmail, {
            url: `${continueOrigin}/reset-password`,
          });
        } else if (apiErr?.status === 429) {
          setError('Please wait before requesting another reset link.');
          return;
        } else {
          throw apiErr;
        }
      }

      setSubmittedEmail(cleanEmail);
      setCooldown(COOLDOWN_SECONDS);
      setViewMode('link-sent');
    } catch (err: any) {
      setError(err?.message || 'Unable to process reset request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.requestPasswordResetOtp(cleanEmail);
      setSubmittedEmail(cleanEmail);
      setCooldown(COOLDOWN_SECONDS);
      setViewMode('otp-code');
    } catch (err: any) {
      setError(err?.message || 'Unable to dispatch verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittedEmail || !otpCode) return;

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.verifyPasswordResetOtp(submittedEmail, otpCode.trim());
      setGrantToken(res.grantToken);
      setViewMode('set-password');
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired code. Please check and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittedEmail || !grantToken) return;

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setError(validation.message || 'Please meet all password requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.resetPasswordWithGrant(submittedEmail, grantToken, newPassword);
      setViewMode('success');
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Session may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomerLayout>
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
              {viewMode === 'set-password'
                ? 'Create New Password'
                : viewMode === 'otp-code'
                ? 'Enter 6-Digit Code'
                : 'Reset Your Password'}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              {viewMode === 'set-password'
                ? 'Enter your new secure password below.'
                : viewMode === 'otp-code'
                ? `Enter the 6-digit code sent to ${submittedEmail ? maskEmail(submittedEmail) : 'your email'}.`
                : 'Choose whether to receive a 6-digit code or an email link to reset your password.'}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* VIEW: Initial Request Form */}
          {viewMode === 'request' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Email Address</label>
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

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSubmitting}
                  className="w-full h-11 px-4 bg-[#1D6FF2] hover:bg-[#1558C0] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {isSubmitting ? 'Dispatching...' : 'Send 6-Digit Code (Instant)'}
                </button>

                <button
                  type="button"
                  onClick={handleSendLink}
                  disabled={isSubmitting}
                  className="w-full h-11 px-4 border border-[#E4E9F2] hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors text-xs flex items-center justify-center cursor-pointer"
                >
                  Send Email Link Instead
                </button>
              </div>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="text-slate-500 hover:text-[#1D6FF2] font-semibold transition-colors text-[11px]"
                >
                  Remembered your password? Back to Login
                </Link>
              </div>
            </div>
          )}

          {/* VIEW: Link Sent Confirmation */}
          {viewMode === 'link-sent' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📬</span>
                  <p className="font-bold">Check your inbox</p>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  If an account exists with <strong>{submittedEmail ? maskEmail(submittedEmail) : ''}</strong>, we&apos;ve dispatched a
                  password reset link. The link expires in 1 hour.
                </p>
                <p className="text-[11px] text-slate-500 pt-1">
                  💡 Don&apos;t see the email? Be sure to check your spam or junk folder.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleSendLink}
                  disabled={cooldown > 0 || isSubmitting}
                  className="w-full h-11 px-4 border border-[#1D6FF2] text-[#1D6FF2] hover:bg-blue-50 disabled:border-slate-200 disabled:text-slate-400 font-bold rounded-xl transition-colors text-xs flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend Email Link'}
                </button>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="w-full h-11 px-4 bg-[#F8FAFC] hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-[#E4E9F2] text-xs flex items-center justify-center cursor-pointer"
                >
                  Switch to 6-Digit Code
                </button>
              </div>
            </div>
          )}

          {/* VIEW: 6-Digit OTP Entry */}
          {viewMode === 'otp-code' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 text-center">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  disabled={isSubmitting}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="h-14 w-full text-center text-2xl font-black tracking-[8px] bg-[#F8FAFC] border-2 border-[#1D6FF2] rounded-2xl focus:bg-white text-slate-900 outline-none transition-colors font-mono"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 text-center mt-2">
                  Code expires in 10 minutes. Check your spam folder if delayed.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otpCode.length !== 6}
                className="w-full h-11 px-4 bg-[#1D6FF2] hover:bg-[#1558C0] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isSubmitting ? 'Verifying...' : 'Verify Code & Set Password'}
              </button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={cooldown > 0 || isSubmitting}
                  className="text-[#1D6FF2] disabled:text-slate-400 font-bold text-[11px] cursor-pointer"
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('request')}
                  className="text-slate-500 hover:text-slate-700 font-semibold text-[11px] cursor-pointer"
                >
                  Change email
                </button>
              </div>
            </form>
          )}

          {/* VIEW: Set New Password via Grant */}
          {viewMode === 'set-password' && (
            <form onSubmit={handleApplyNewPassword} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">New Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isSubmitting}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="h-11 w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl focus:border-[#1D6FF2] focus:bg-white text-slate-900 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isSubmitting}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="h-11 w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl focus:border-[#1D6FF2] focus:bg-white text-slate-900 outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 px-4 bg-[#1D6FF2] hover:bg-[#1558C0] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isSubmitting ? 'Updating...' : 'Set New Password & Sign In'}
              </button>
            </form>
          )}

          {/* VIEW: Final Success */}
          {viewMode === 'success' && (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  <p className="font-bold">Password Reset Complete</p>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Your password has been updated successfully. All active sessions have been signed out for security.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full h-11 px-4 bg-[#1D6FF2] hover:bg-[#1558C0] text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-xs flex items-center justify-center cursor-pointer"
                >
                  Sign In With New Password
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
