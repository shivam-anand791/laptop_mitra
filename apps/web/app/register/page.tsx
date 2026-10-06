'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerLayout from '../../components/CustomerLayout';
import { useAuth } from '../../lib/auth-context';
import { formatAuthError } from '../../lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    referralCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        referralCode: formData.referralCode.trim() || undefined,
      });
      router.push('/profile');
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="bg-[#F8FAFC] min-h-[80vh] flex items-center justify-center py-12 sm:py-16 px-4">
        <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-[#E4E9F2] shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-[#0B1F4B] border border-blue-500/20 rounded-2xl flex items-center justify-center text-white font-black text-lg mx-auto shadow-sm">
              <span className="text-[#1D6FF2]">LM</span>
            </div>
            <h1 className="text-2xl font-black text-[#0B1F4B] tracking-tight">
              Create Account
            </h1>
            <p className="text-xs text-slate-500">
              Join LaptopMitra to track laptop warranties, order status, and Mitra affiliate earnings.
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
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Priya Patel"
                className="h-11 w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl focus:border-[#1D6FF2] focus:bg-white text-slate-900 outline-none transition-colors"
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
                value={formData.email}
                onChange={handleChange}
                placeholder="you@company.com"
                className="h-11 w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl focus:border-[#1D6FF2] focus:bg-white text-slate-900 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Mobile Number (For Express Delivery SMS)
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className="h-11 w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl font-mono focus:border-[#1D6FF2] focus:bg-white text-slate-900 outline-none transition-colors"
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
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  className="h-11 w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl focus:border-[#1D6FF2] focus:bg-white text-slate-900 outline-none transition-colors pr-10"
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
                value={formData.referralCode}
                onChange={handleChange}
                placeholder="e.g. MITRA4521"
                className="h-11 w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E4E9F2] rounded-xl font-mono uppercase focus:border-[#1D6FF2] focus:bg-white text-slate-900 outline-none transition-colors"
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
              {isSubmitting ? 'Creating Account...' : 'Create Account & Start Shopping'}
            </button>
          </form>

          <div className="pt-4 border-t border-[#E4E9F2] text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#1D6FF2] hover:underline">
              Sign in here →
            </Link>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
