'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ActionCodeOperation, applyActionCode, checkActionCode } from 'firebase/auth';
import CustomerLayout from '../../components/CustomerLayout';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { auth } from '../../lib/firebase';
import { getDefaultRoleDestination } from '../../lib/redirect';

type VerificationStage =
  | 'loading'
  | 'ready'
  | 'sending'
  | 'sent'
  | 'verified'
  | 'sync-failed'
  | 'invalid'
  | 'wrong-account';

const FALLBACK_ERROR_MESSAGE = "We couldn't send the email right now. Try again in a few minutes.";

function sanitizeErrorMessage(error: any): string {
  if (!error) return FALLBACK_ERROR_MESSAGE;
  const msg = typeof error === 'string' ? error : error?.message;
  if (!msg || typeof msg !== 'string') return FALLBACK_ERROR_MESSAGE;
  // Never expose raw technical/server error strings to users
  if (
    msg.includes('Cannot POST') ||
    msg.includes('Cannot GET') ||
    msg.includes('Not Found') ||
    msg.includes('404') ||
    msg.includes('500') ||
    msg.includes('503') ||
    msg.includes('NetworkError') ||
    msg.includes('Failed to fetch')
  ) {
    return FALLBACK_ERROR_MESSAGE;
  }
  return msg;
}

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    firebaseUser,
    isLoading,
    sendVerificationEmail,
    refreshAuthenticatedUser,
    cancelSyncAndSignOut,
    user,
  } = useAuth();

  const mode = searchParams.get('mode');
  const actionCode = searchParams.get('oobCode');
  const sendFailed = searchParams.get('sendFailed') === '1';
  const emailWasSent = searchParams.get('sent') === '1';

  const actionPromise = useRef<Promise<{
    stage: 'verified' | 'sync-failed' | 'invalid' | 'wrong-account';
    email?: string;
  }> | null>(null);

  const [stage, setStage] = useState<VerificationStage>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(
      () => setCooldown((remaining) => Math.max(0, remaining - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    let active = true;

    // Handle verification link click (from email)
    if (mode === 'verifyEmail' && actionCode) {
      if (!actionPromise.current) {
        actionPromise.current = (async () => {
          try {
            const action = await checkActionCode(auth, actionCode);
            if (action.operation !== ActionCodeOperation.VERIFY_EMAIL) {
              return { stage: 'invalid' as const };
            }
            const targetEmail = action.data.email || undefined;
            const currentUser = auth.currentUser;
            if (
              currentUser?.email &&
              targetEmail &&
              currentUser.email.toLowerCase() !== targetEmail.toLowerCase()
            ) {
              return { stage: 'wrong-account' as const, email: targetEmail };
            }

            await applyActionCode(auth, actionCode);
            window.history.replaceState(null, '', '/verify-email');

            if (
              !currentUser ||
              (targetEmail && currentUser.email?.toLowerCase() !== targetEmail.toLowerCase())
            ) {
              return { stage: 'verified' as const, email: targetEmail };
            }

            try {
              await refreshAuthenticatedUser();
              return { stage: 'verified' as const, email: targetEmail };
            } catch {
              return { stage: 'sync-failed' as const, email: targetEmail };
            }
          } catch {
            return { stage: 'invalid' as const };
          }
        })();
      }

      setStage('loading');
      void actionPromise.current.then((result) => {
        if (!active) return;
        setEmail(result.email || auth.currentUser?.email || null);
        setStage(result.stage);
      });
      return () => {
        active = false;
      };
    }

    if (isLoading) return;
    setEmail(firebaseUser?.email || null);
    if (firebaseUser?.emailVerified) {
      setStage('loading');
      void refreshAuthenticatedUser().then(
        () => active && setStage('verified'),
        () => active && setStage('sync-failed')
      );
    } else {
      setStage('ready');
      if (sendFailed) {
        setMessage(FALLBACK_ERROR_MESSAGE);
        setIsError(true);
      }
    }

    return () => {
      active = false;
    };
  }, [mode, actionCode, isLoading, firebaseUser?.uid, firebaseUser?.emailVerified, sendFailed, refreshAuthenticatedUser]);

  const handleResend = async () => {
    setStage('sending');
    setMessage(null);
    setIsError(false);
    try {
      const result = await sendVerificationEmail();
      if (result.alreadyVerified) {
        await refreshAuthenticatedUser();
        setStage('verified');
        return;
      }
      setCooldown(60);
      setStage('sent');
    } catch (error: any) {
      if (error?.status === 429) setCooldown(60);
      setStage('ready');
      setIsError(true);
      setMessage(sanitizeErrorMessage(error));
    }
  };

  const handleCheckVerified = useCallback(async () => {
    setIsCheckingStatus(true);
    setMessage(null);
    setIsError(false);
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          await refreshAuthenticatedUser();
          setStage('verified');
          return;
        }
      }
      setMessage("Your email is not verified yet. Please check your inbox and click the link first.");
      setIsError(false);
    } catch (err: any) {
      setIsError(true);
      setMessage(sanitizeErrorMessage(err));
    } finally {
      setIsCheckingStatus(false);
    }
  }, [refreshAuthenticatedUser]);

  const handleSignOut = async () => {
    await cancelSyncAndSignOut();
    router.replace('/login');
  };

  const continueHref = user
    ? getDefaultRoleDestination(user.role)
    : `/login${email ? `?email=${encodeURIComponent(email)}` : ''}`;
  const mismatchLogin = email ? `/login?email=${encodeURIComponent(email)}` : '/login';

  return (
    <div className="bg-[#F8FAFC] min-h-[75vh] flex items-center justify-center py-12 px-4">
      <section
        className="w-full max-w-lg rounded-3xl border border-[#E4E9F2] bg-white p-8 text-center shadow-sm sm:p-10"
        aria-live="polite"
      >
        <Link href="/" className="mb-6 inline-block">
          <Image
            src="/logo.png"
            alt="Laptop Mitra"
            width={180}
            height={60}
            className="mx-auto h-10 w-auto object-contain"
            priority
          />
        </Link>

        {stage === 'loading' && (
          <div className="py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#1D6FF2] border-r-transparent align-[-0.125em]" />
            <p className="mt-4 text-sm font-medium text-slate-600">Checking your verification status…</p>
          </div>
        )}

        {stage === 'ready' && (
          <>
            <h1 className="text-2xl font-black text-[#0B1F4B]">Verify your email</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {email ? (
                <>
                  Your account email is <strong className="text-slate-800">{email}</strong>.
                  Verification ensures full account access and security.
                </>
              ) : (
                'Sign in to resend your account verification email.'
              )}
            </p>

            {message && (
              <div
                className={`mt-4 rounded-xl p-3 text-sm flex items-center justify-between gap-2 text-left ${
                  isError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
                role="alert"
              >
                <span>{message}</span>
                {isError && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0}
                    className="shrink-0 text-xs font-bold underline hover:text-rose-900"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {firebaseUser?.email && !firebaseUser.emailVerified ? (
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0}
                  className="w-full rounded-xl bg-[#1D6FF2] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1558C0] disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                >
                  {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Send verification email'}
                </button>

                <button
                  type="button"
                  onClick={handleCheckVerified}
                  disabled={isCheckingStatus}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {isCheckingStatus ? 'Checking status…' : "I've verified, refresh"}
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="mt-6 block w-full rounded-xl bg-[#1D6FF2] px-4 py-3 text-sm font-bold text-white hover:bg-[#1558C0]"
              >
                Go to sign in
              </Link>
            )}
          </>
        )}

        {stage === 'sending' && (
          <div className="py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#1D6FF2] border-r-transparent align-[-0.125em]" />
            <p className="mt-4 text-sm font-medium text-slate-600">Sending a new verification email…</p>
          </div>
        )}

        {stage === 'sent' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#1D6FF2]" aria-hidden="true">
              ✉
            </div>
            <h1 className="text-2xl font-black text-[#0B1F4B]">Check your inbox</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              A verification link was sent to <strong className="text-slate-800">{email}</strong>.
              Click the link in the email to verify your address.
            </p>
            <p className="mt-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              💡 Tip: If you don&apos;t see the message within 1-2 minutes, please check your spam, junk, or promotions folder.
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handleCheckVerified}
                disabled={isCheckingStatus}
                className="w-full rounded-xl bg-[#1D6FF2] px-4 py-3 text-sm font-bold text-white hover:bg-[#1558C0] disabled:opacity-50 shadow-sm"
              >
                {isCheckingStatus ? 'Checking status…' : "I've verified, refresh"}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                className="w-full rounded-xl border border-[#1D6FF2] px-4 py-3 text-sm font-bold text-[#1D6FF2] transition hover:bg-blue-50 disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend email'}
              </button>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-200 text-left">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Or enter 6-digit verification code:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="h-11 flex-1 text-center font-mono text-base font-bold tracking-[4px] bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl outline-none focus:border-[#1D6FF2]"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (otpInput.length !== 6) return;
                    setIsSubmittingOtp(true);
                    setMessage(null);
                    setIsError(false);
                    try {
                      await api.verifyEmailOtp(otpInput.trim());
                      await refreshAuthenticatedUser().catch(() => undefined);
                      setStage('verified');
                    } catch (err: any) {
                      setIsError(true);
                      setMessage(err?.message || 'Invalid or expired verification code.');
                    } finally {
                      setIsSubmittingOtp(false);
                    }
                  }}
                  disabled={otpInput.length !== 6 || isSubmittingOtp}
                  className="h-11 px-4 bg-[#1D6FF2] hover:bg-[#1558C0] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  {isSubmittingOtp ? '...' : 'Verify Code'}
                </button>
              </div>
            </div>
          </>
        )}

        {stage === 'verified' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-xl font-bold" aria-hidden="true">
              ✓
            </div>
            <h1 className="text-2xl font-black text-[#0B1F4B]">Email verified</h1>
            <p className="mt-3 text-sm text-slate-600">Your Laptop Mitra account is verified and ready.</p>
            <Link
              href={continueHref}
              className="mt-6 block w-full rounded-xl bg-[#1D6FF2] px-4 py-3 text-sm font-bold text-white hover:bg-[#1558C0] shadow-sm"
            >
              Continue to Account
            </Link>
          </>
        )}

        {stage === 'sync-failed' && (
          <>
            <h1 className="text-2xl font-black text-[#0B1F4B]">Email verified</h1>
            <p className="mt-3 text-sm text-slate-600">Your email is verified, but we could not refresh your profile yet.</p>
            <button
              type="button"
              onClick={() =>
                void refreshAuthenticatedUser()
                  .then(() => setStage('verified'))
                  .catch(() => {
                    setIsError(true);
                    setMessage('Profile sync is still unavailable. Please try again.');
                  })
              }
              className="mt-6 w-full rounded-xl bg-[#1D6FF2] px-4 py-3 text-sm font-bold text-white hover:bg-[#1558C0]"
            >
              Retry profile sync
            </button>
            {message && <p className="mt-3 text-sm text-rose-700" role="alert">{message}</p>}
          </>
        )}

        {stage === 'invalid' && (
          <>
            <h1 className="text-2xl font-black text-[#0B1F4B]">This link is invalid or expired</h1>
            <p className="mt-3 text-sm text-slate-600">Request a fresh verification email and click its newest link.</p>
            {firebaseUser?.email && !firebaseUser.emailVerified ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                className="mt-6 w-full rounded-xl bg-[#1D6FF2] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {cooldown ? `Resend available in ${cooldown}s` : 'Resend verification email'}
              </button>
            ) : (
              <Link href="/login" className="mt-6 block rounded-xl bg-[#1D6FF2] px-4 py-3 text-sm font-bold text-white">
                Sign in
              </Link>
            )}
          </>
        )}

        {stage === 'wrong-account' && (
          <>
            <h1 className="text-2xl font-black text-[#0B1F4B]">Use the matching account</h1>
            <p className="mt-3 text-sm text-slate-600">
              This verification link belongs to <strong>{email}</strong>, but a different account is signed in.
            </p>
            <button
              type="button"
              onClick={async () => {
                await cancelSyncAndSignOut();
                router.replace(mismatchLogin);
              }}
              className="mt-6 w-full rounded-xl bg-[#1D6FF2] px-4 py-3 text-sm font-bold text-white"
            >
              Switch account
            </button>
          </>
        )}

        {/* Global Navigation & Exit Links: User is NEVER blocked from leaving */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Quick Navigation</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-slate-600">
            <Link href="/" className="hover:text-[#1D6FF2] transition">
              Continue Shopping
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/account/orders" className="hover:text-[#1D6FF2] transition">
              My Account
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/help" className="hover:text-[#1D6FF2] transition">
              Help Center
            </Link>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-slate-600 hover:text-rose-600 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <CustomerLayout>
      <Suspense
        fallback={
          <div className="flex min-h-[75vh] items-center justify-center text-sm text-slate-500">
            Loading verification…
          </div>
        }
      >
        <VerifyEmailForm />
      </Suspense>
    </CustomerLayout>
  );
}
