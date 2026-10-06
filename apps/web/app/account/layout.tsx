'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  User,
  MapPin,
  Package,
  Heart,
  CreditCard,
  ShieldCheck,
  Share2,
  Bell,
  Lock,
  LogOut,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/account', label: 'Dashboard & Overview', icon: LayoutDashboard },
  { href: '/account/profile', label: 'My Profile', icon: User },
  { href: '/account/addresses', label: 'Manage Addresses', icon: MapPin },
  { href: '/account/orders', label: 'Orders & Returns', icon: Package },
  { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/account/payments', label: 'Payment History', icon: CreditCard },
  { href: '/account/warranty-support', label: 'Warranty & Support', icon: ShieldCheck },
  { href: '/account/referral', label: 'Mitra Partner & Rewards', icon: Share2 },
  { href: '/account/notifications', label: 'Notification Settings', icon: Bell },
  { href: '/account/security', label: 'Security & Privacy', icon: Lock },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isGuest, logout } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Breadcrumb & Hero */}
      <div className="bg-slate-900 border-b border-slate-800 text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
              <Link href="/" className="hover:text-white transition">Home</Link>
              <span>/</span>
              <span className="text-blue-400">My Account</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Account Hub
              <span className="text-xs bg-blue-500/20 text-blue-300 font-semibold px-2.5 py-1 rounded-full border border-blue-500/30">
                {isGuest ? 'Guest Session' : 'Verified Member'}
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage your orders, certified warranty claims, addresses, and Mitra affiliate earnings.
            </p>
          </div>

          {isGuest && (
            <button
              onClick={() => router.push('/register')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              Save Account & Orders
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Guest Warning Banner if in Guest Mode */}
      {isGuest && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 text-amber-900 text-xs sm:text-sm font-medium">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>You are browsing as a guest. Create an account to permanently retain your purchase history, GST invoices, and addresses.</span>
            </div>
            <Link href="/register" className="text-amber-700 font-bold hover:underline whitespace-nowrap">
              Link Account →
            </Link>
          </div>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1 space-y-6">
            {/* User Profile Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-600/20">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">
                    {user?.name || (isGuest ? 'Guest Customer' : 'Valued Customer')}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">{user?.email || 'guest@laptopmitra.local'}</p>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Certified Buyer</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-2 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-bold shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}

              <div className="pt-2 mt-2 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </nav>

            {/* Support Quick Contact Box */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 border border-slate-700 shadow-md">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                32-Point Assured Care
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Need on-site diagnostics or priority warranty claim assistance?
              </p>
              <Link
                href="/account/warranty-support"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300"
              >
                Raise Support Ticket →
              </Link>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-3 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
