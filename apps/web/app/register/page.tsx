'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerLayout from '../../components/CustomerLayout';
import { useAuth } from '../../lib/auth-context';

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
      setError(err.message || 'Registration failed. Email may already be in use.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="bg-[#F5F7FA] min-h-[80vh] flex items-center justify-center py-12 sm:py-16 px-4">
        <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-[#0B1F4B] border border-blue-500/30 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg mx-auto shadow-md shadow-blue-500/10">
              <span className="text-[#1D6FF2]">LM</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#0B1F4B]">
              Join LaptopMitra
            </h1>
            <p className="text-xs text-slate-500">
              Create an account to track laptop warranties, order status, and Mitra affiliate rewards.
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
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Priya Patel"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1D6FF2] focus:bg-white text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1D6FF2] focus:bg-white text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mobile Number (For Delivery Updates)
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1D6FF2] focus:bg-white text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1D6FF2] focus:bg-white text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Friend&apos;s Mitra Referral Code (Optional)
              </label>
              <input
                type="text"
                name="referralCode"
                value={formData.referralCode}
                onChange={handleChange}
                placeholder="e.g. MITRA4521"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-[#1D6FF2] focus:bg-white text-slate-800 outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Applying a referral code gives you ₹500 off on your first laptop purchase.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#1D6FF2] hover:bg-[#1558C0] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account & Start Shopping'}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#1D6FF2] hover:underline">
              Sign In →
            </Link>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
