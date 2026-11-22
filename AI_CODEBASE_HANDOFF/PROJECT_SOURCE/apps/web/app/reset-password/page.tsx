'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import CustomerLayout from '../../components/CustomerLayout';
import { api } from '../../lib/api';
import { auth, verifyPasswordResetCode, confirmPasswordReset } from '../../lib/firebase';

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [local, domain] = parts;
  if (local.length <= 1) return `*@${domain}`;
  if (local.length === 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters long.' };
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain at least one number.' };
  if (!/[@$!%*?&]/.test(password)) return { valid: false, message: 'Password must contain at least one special character (@$!%*?&).' };
  return { valid: true };
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode') || searchParams.get('token');

  const [stage, setStage] = useState<'verifying' | 'ready' | 'submitting' | 'success' | 'invalid'>('verifying');
  const [targetEmail, setTargetEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!oobCode) {
      setStage('invalid');
      return;
    }

    let isMounted = true;
    verifyPasswordResetCode(auth, oobCode)
      .then((email: string) => {
        if (!isMounted) return;
        setTargetEmail(email);
        setStage('ready');
      })
      .catch(() => {
        if (!isMounted) return;
        setStage('invalid');
      });

    return () => {
      isMounted = false;
    };
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode || stage !== 'ready') return;

    setError(null);

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setError(validation.message || 'Please meet all password requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setStage('submitting');

    try {
      // 1. Confirm reset in Firebase Auth
      await confirmPasswordReset(auth, oobCode, newPassword);

      // 2. Post-hook: Revoke sessions across devices & dispatch confirmation email
      if (targetEmail) {
        api.confirmPasswordReset(targetEmail).catch(() => undefined);
      }

      setStage('success');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        setStage('invalid');
      } else {
        setError(err?.message || 'Failed to update password. Please try again.');
        setStage('ready');
      }
    }
  };

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
            Choose New Password
          </h1>
          {targetEmail && (
            <p className="text-xs text-slate-500">
              Setting new password for <strong>{maskEmail(targetEmail)}</strong>
            </p>
          )}
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        {stage === 'verifying' && (
          <div className="py-8 text-center space-y-3">
            <div className="animate-spin h-8 w-8 border-3 border-[#1D6FF2] border-t-transparent rounded-full mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Validating security link...</p>
          </div>
        )}

        {stage === 'invalid' && (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2 text-left">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <p className="font-bold">Link Expired or Invalid</p>
              </div>
              <p className="text-slate-600 leading-relaxed">
                This password reset link is invalid, has expired, or has already been used. Password reset links are
                single-use and remain valid for 1 hour from request.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                href="/forgot-password"
                className="w-full h-11 px-4 bg-[#1D6FF2] hover:bg-[#1558C0] text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-xs flex items-center justify-center cursor-pointer"
              >
                Request a New Reset Link
              </Link>
              <Link
                href="/login"
                className="w-full h-11 px-4 border border-[#E4E9F2] text-slate-700 hover:bg-slate-50 font-bold rounded-xl transition-colors text-xs flex items-center justify-center cursor-pointer"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}

        {stage === 'success' && (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2 text-left">
              <div className="flex items-center gap-2">
                <span className="text-lg">✓</span>
                <p className="font-bold">Password Reset Complete</p>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Your password has been updated successfully. For your security, all active sessions on other devices
                have been terminated.
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

        {(stage === 'ready' || stage === 'submitting') && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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
                disabled={stage === 'submitting'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="h-11 w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl focus:border-[#1D6FF2] focus:bg-white text-slate-900 outline-none transition-colors disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={stage === 'submitting'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="h-11 w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl focus:border-[#1D6FF2] focus:bg-white text-slate-900 outline-none transition-colors disabled:opacity-60"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-600">
              <p className="font-semibold text-slate-700">Password requirements:</p>
              <p className={newPassword.length >= 8 ? 'text-emerald-600' : 'text-slate-500'}>
                • Minimum 8 characters
              </p>
              <p className={/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? 'text-emerald-600' : 'text-slate-500'}>
                • Uppercase and lowercase letters
              </p>
              <p className={/[0-9]/.test(newPassword) ? 'text-emerald-600' : 'text-slate-500'}>
                • At least one number
              </p>
              <p className={/[@$!%*?&]/.test(newPassword) ? 'text-emerald-600' : 'text-slate-500'}>
                • At least one special symbol (@$!%*?&)
              </p>
            </div>

            <button
              type="submit"
              disabled={stage === 'submitting'}
              className="w-full h-11 px-4 bg-[#1D6FF2] hover:bg-[#1558C0] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {stage === 'submitting' ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Updating Password...
                </>
              ) : (
                'Set New Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <CustomerLayout>
      <Suspense
        fallback={
          <div className="bg-[#F8FAFC] min-h-[75vh] flex items-center justify-center py-12 sm:py-16 px-4">
            <div className="animate-spin h-8 w-8 border-3 border-[#1D6FF2] border-t-transparent rounded-full" />
          </div>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </CustomerLayout>
  );
}

