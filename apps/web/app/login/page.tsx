'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerLayout from '../../components/CustomerLayout';
import { useAuth } from '../../lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, guestLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push('/profile');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
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
      await guestLogin();
      router.push('/profile');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to start a guest session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="bg-[#F5F7FA] min-h-[75vh] flex items-center justify-center py-12 sm:py-16 px-4">
        <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-[#0B1F4B] border border-blue-500/30 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg mx-auto shadow-md shadow-blue-500/10">
              <span className="text-[#1D6FF2]">LM</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#0B1F4B]">
              Welcome Back
            </h1>
            <p className="text-xs text-slate-500">
              Sign in to manage your laptop orders and Mitra affiliate earnings.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1D6FF2] focus:bg-white text-slate-800 outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">
                  Password
                </label>
                <span className="text-[11px] font-semibold text-[#1D6FF2] hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1D6FF2] focus:bg-white text-slate-800 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#1D6FF2] hover:bg-[#1558C0] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? 'Signing In...' : 'Sign In to LaptopMitra'}
            </button>
          </form>

          <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200" />
            OR
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={isSubmitting}
            className="w-full py-3 border border-[#1D6FF2] text-[#1D6FF2] hover:bg-blue-50 disabled:opacity-50 font-bold rounded-xl transition-colors text-xs"
          >
            {isSubmitting ? 'Starting Guest Session...' : 'Continue as Guest'}
          </button>

          {/* Quick Demo Fill */}
          <div className="pt-1">
            <button
              type="button"
              onClick={fillDemo}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              ⚡ Quick Fill Demo Account
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-bold text-[#1D6FF2] hover:underline">
              Create free account →
            </Link>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
