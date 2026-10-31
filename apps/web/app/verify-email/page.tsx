'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ActionCodeOperation, applyActionCode, checkActionCode } from 'firebase/auth';
import CustomerLayout from '../../components/CustomerLayout';
import { useAuth } from '../../lib/auth-context';
import { auth } from '../../lib/firebase';
import { getDefaultRoleDestination } from '../../lib/redirect';

type VerificationStage = 'loading' | 'ready' | 'sending' | 'sent' | 'verified' | 'sync-failed' | 'invalid' | 'wrong-account';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firebaseUser, isLoading, sendVerificationEmail, refreshAuthenticatedUser, cancelSyncAndSignOut, user } = useAuth();
  const mode = searchParams.get('mode');
  const actionCode = searchParams.get('oobCode');
  const sendFailed = searchParams.get('sendFailed') === '1';
  const emailWasSent = searchParams.get('sent') === '1';
  const actionPromise = useRef<Promise<{ stage: 'verified' | 'sync-failed' | 'invalid' | 'wrong-account'; email?: string }> | null>(null);
  const [stage, setStage] = useState<VerificationStage>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((remaining) => Math.max(0, remaining - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    let active = true;

    if (mode === 'verifyEmail' && actionCode) {
      if (!actionPromise.current) {
        actionPromise.current = (async () => {
          try {
            const action = await checkActionCode(auth, actionCode);
            if (action.operation !== ActionCodeOperation.VERIFY_EMAIL) return { stage: 'invalid' as const };
            const targetEmail = action.data.email || undefined;
            const currentUser = auth.currentUser;
            if (currentUser?.email && targetEmail && currentUser.email.toLowerCase() !== targetEmail.toLowerCase()) {
              return { stage: 'wrong-account' as const, email: targetEmail };
            }

            await applyActionCode(auth, actionCode);
            window.history.replaceState(null, '', '/verify-email');

            if (!currentUser || (targetEmail && currentUser.email?.toLowerCase() !== targetEmail.toLowerCase())) {
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
        () => active && setStage('sync-failed'),
      );
    } else {
      setStage('ready');
      if (sendFailed) setMessage('Your account was created, but we could not send the email. Check your connection and try again.');
    }

    return () => {
      active = false;
    };
  }, [mode, actionCode, isLoading, firebaseUser?.uid, firebaseUser?.emailVerified, sendFailed, refreshAuthenticatedUser]);

  const resend = async () => {
    setStage('sending');
    setMessage(null);
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
      setMessage(error?.message || 'We could not send the verification email. Please try again shortly.');
    }
  };

  const continueHref = user ? getDefaultRoleDestination(user.role) : `/login${email ? `?email=${encodeURIComponent(email)}` : ''}`;
  const mismatchLogin = email ? `/login?email=${encodeURIComponent(email)}` : '/login';

  return (
    <div className="bg-[#F8FAFC] min-h-[75vh] flex items-center justify-center py-12 px-4">
      <section className="w-full max-w-md rounded-3xl border border-[#E4E9F2] bg-white p-8 text-center shadow-sm sm:p-10" aria-live="polite">
        <Link href="/" className="mb-6 inline-block">
          <Image src="/logo.png" alt="Laptop Mitra" width={180} height={60} className="mx-auto h-10 w-auto object-contain" priority />
        </Link>

        {stage === 'loading' && <p className="text-sm text-slate-600">Checking your verification link…</p>}

        {stage === 'ready' && (
          <>
            <h1 className="text-2xl font-black text-[#0B1F4B]">Verify your email</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {sendFailed
                ? <>We couldn’t send a verification email to <strong className="text-slate-800">{email}</strong>.</>
                : emailWasSent && email
                  ? <>We sent a verification link to <strong className="text-slate-800">{email}</strong>.</>
                  : email
                    ? <>Your account email is <strong className="text-slate-800">{email}</strong>.</>
                    : 'Sign in to resend your account verification email.'}
              {!sendFailed && emailWasSent ? ' Open the link in your email to continue.' : ''}
            </p>
            {message && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{message}</p>}
            {firebaseUser?.email && !firebaseUser.emailVerified ? (
              <button type="button" onClick={resend} disabled={cooldown > 0} className="mt-6 w-full rounded-xl bg-[#1D6FF2] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1558C0] disabled:cursor-not-allowed disabled:opacity-50">
                {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification email'}
              </button>
            ) : (
              <Link href="/login" className="mt-6 block w-full rounded-xl bg-[#1D6FF2] px-4 py-3 text-sm font-bold text-white hover:bg-[#1558C0]">Go to sign in</Link>
            )}
          </>
        )}

        {stage === 'sending' && <p className="text-sm text-slate-600">Sending a new verification email…</p>}
        {stage === 'sent' && (
          <>
            <h1 className="text-2xl font-black text-[#0B1F4B]">Check your inbox</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">A new verification link has been sent to <strong className="text-slate-800">{email}</strong>. You can request another in {cooldown} seconds.</p>
            <button type="button" onClick={resend} disabled={cooldown > 0} className="mt-6 w-full rounded-xl border border-[#1D6FF2] px-4 py-3 text-sm font-bold text-[#1D6FF2] disabled:opacity-50">{cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend email'}</button>
          </>
        )}

        {stage === 'verified' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600" aria-hidden="true">✓</div>
            <h1 className="text-2xl font-black text-[#0B1F4B]">Email verified</h1>
            <p className="mt-3 text-sm text-slate-600">Your Laptop Mitra account is ready.</p>
            <Link href={continueHref} className="mt-6 block w-full rounded-xl bg-[#1D6FF2] px-4 py-3 text-sm font-bold text-white hover:bg-[#1558C0]">Continue</Link>
          </>
        )}

        {stage === 'sync-failed' && (
          <>
            <h1 className="text-2xl font-black text-[#0B1F4B]">Email verified</h1>
            <p className="mt-3 text-sm text-slate-600">Your email is verified, but we could not refresh your profile yet.</p>
            <button type="button" onClick={() => void refreshAuthenticatedUser().then(() => setStage('verified')).catch(() => setMessage('Profile sync is still unavailable. Please try again.'))} className="mt-6 w-full rounded-xl bg-[#1D6FF2] px-4 py-3 text-sm font-bold text-white">Retry profile sync</button>
            {message && <p className="mt-3 text-sm text-rose-700" role="alert">{message}</p>}
          </>
        )}

        {stage === 'invalid' && (
          <>
            <h1 className="text-2xl font-black text-[#0B1F4B]">This link is invalid or expired</h1>
            <p className="mt-3 text-sm text-slate-600">Request a fresh verification email and use its newest link.</p>
            {firebaseUser?.email && !firebaseUser.emailVerified ? (
              <button type="button" onClick={resend} disabled={cooldown > 0} className="mt-6 w-full rounded-xl bg-[#1D6FF2] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{cooldown ? `Resend available in ${cooldown}s` : 'Resend verification email'}</button>
            ) : <Link href="/login" className="mt-6 block rounded-xl bg-[#1D6FF2] px-4 py-3 text-sm font-bold text-white">Sign in</Link>}
          </>
        )}

        {stage === 'wrong-account' && (
          <>
            <h1 className="text-2xl font-black text-[#0B1F4B]">Use the matching account</h1>
            <p className="mt-3 text-sm text-slate-600">This verification link belongs to <strong>{email}</strong>, but a different account is signed in.</p>
            <button type="button" onClick={async () => { await cancelSyncAndSignOut(); router.replace(mismatchLogin); }} className="mt-6 w-full rounded-xl bg-[#1D6FF2] px-4 py-3 text-sm font-bold text-white">Switch account</button>
          </>
        )}
      </section>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <CustomerLayout>
      <Suspense fallback={<div className="flex min-h-[75vh] items-center justify-center text-sm text-slate-500">Loading verification…</div>}>
        <VerifyEmailForm />
      </Suspense>
    </CustomerLayout>
  );
}
