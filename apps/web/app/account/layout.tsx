'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useSupportConfig } from '@/lib/support-config';
import CustomerLayout from '@/components/CustomerLayout';
import {
  Package,
  User,
  MapPin,
  Lock,
  Bell,
  Share2,
  Heart,
  LifeBuoy,
  RotateCcw,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Menu,
  X,
  Tag,
  Laptop,
  Wrench,
} from 'lucide-react';

interface NavGroup {
  title: string;
  items: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeCount?: number;
  }>;
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isGuest, isLoading, logout } = useAuth();
  const { data: supportConfig } = useSupportConfig();
  const [unreadTicketsCount, setUnreadTicketsCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isTicketDetail = pathname?.startsWith('/account/tickets/');
  const isReturnDetail = pathname?.startsWith('/account/returns/');
  const isOrderDetail = pathname?.startsWith('/account/orders/');

  // Route guard with ?next= query parameter
  useEffect(() => {
    if (!isLoading && (!user || isGuest)) {
      const current = pathname || '/account/orders';
      router.replace(`/login?next=${encodeURIComponent(current)}`);
    }
  }, [isLoading, user, isGuest, pathname, router]);

  // Support tickets unread count
  useEffect(() => {
    let isMounted = true;
    async function loadUnreadCount() {
      if (!user || user.isGuest) return;
      try {
        const tickets = await api.getTickets();
        if (isMounted && Array.isArray(tickets)) {
          const unread = tickets.filter((t: any) => t.hasUnread).length;
          setUnreadTicketsCount(unread);
        }
      } catch {
        // Fallback silently if offline
      }
    }
    loadUnreadCount();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const navGroups: NavGroup[] = [
    {
      title: 'Orders & Hardware',
      items: [
        { href: '/account/orders', label: 'My Orders', icon: Package },
        { href: '/account/laptops', label: 'My Laptops & Service', icon: Laptop },
      ],
    },
    {
      title: 'Account Settings',
      items: [
        { href: '/account/profile', label: 'Profile Information', icon: User },
        { href: '/account/addresses', label: 'Manage Addresses', icon: MapPin },
        { href: '/account/security', label: 'Security & Password', icon: Lock },
        { href: '/account/notifications', label: 'Notification Settings', icon: Bell },
      ],
    },
    {
      title: 'Rewards',
      items: [
        { href: '/account/coupons', label: 'My Coupons & Offers', icon: Tag },
        { href: '/account/referral', label: 'Mitra Affiliate Program', icon: Share2 },
      ],
    },
    {
      title: 'Saved',
      items: [
        { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
      ],
    },
    {
      title: 'Help and Support',
      items: [
        {
          href: '/account/tickets',
          label: 'My Support Tickets',
          icon: LifeBuoy,
          badgeCount: unreadTicketsCount,
        },
        { href: '/account/returns', label: 'Returns & Replacements', icon: RotateCcw },
        { href: '/account/warranty-support', label: 'Warranty Support', icon: ShieldCheck },
        { href: '/help', label: 'Help Center', icon: HelpCircle },
      ],
    },
  ];

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="min-h-[60vh] bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-500 text-xs font-semibold">
          Loading your account...
        </div>
      </CustomerLayout>
    );
  }

  if (!user || isGuest) {
    const next = pathname || '/account/orders';
    return (
      <CustomerLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-6 text-center">
          <h1 className="text-lg font-bold text-slate-900">Sign in to access your account</h1>
          <p className="max-w-md text-sm text-slate-600">
            Your account pages and support requests are available after signing in.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            Sign in
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  const avatarInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : 'U';

  const tierLabel = user?.referralTier ? `${user.referralTier} Mitra Affiliate` : 'Mitra Affiliate';

  return (
    <CustomerLayout>
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* ── Compact Sub-Header / Breadcrumbs (No giant gradient!) ── */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-slate-900 transition">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link href="/account/orders" className="hover:text-slate-900 transition">
              My Account
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[#2563EB]">
              {pathname === '/account/orders'
                ? 'Orders'
                : pathname === '/account/profile'
                ? 'Profile'
                : pathname === '/account/addresses'
                ? 'Addresses'
                : pathname === '/account/referral'
                ? 'Mitra Affiliate Program'
                : pathname === '/account/wishlist'
                ? 'Wishlist'
                : pathname === '/account/tickets'
                ? 'Support Tickets'
                : isTicketDetail
                ? 'Ticket Details'
                : pathname === '/account/returns'
                ? 'Returns & Replacements'
                : isReturnDetail
                ? 'Return Details'
                : isOrderDetail
                ? 'Order Details'
                : pathname === '/account/warranty-support'
                ? 'Warranty Support'
                : 'Account Hub'}
            </span>
          </nav>

          {/* Mobile menu toggle button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
            aria-label="Toggle Account Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Main Layout Body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 items-start">
          {/* ── Left Sidebar Shell ── */}
          <aside
            className={`lg:col-span-1 space-y-4 ${
              mobileMenuOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* Compact Profile Header (No gradient) */}
            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {avatarInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[#111827] truncate">
                    {user?.name || (isGuest ? 'Guest Customer' : 'Valued Customer')}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">{user?.email || user?.phone || 'Guest session'}</p>
                  <div className="mt-1">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {tierLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grouped Left Account Menu */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs divide-y divide-slate-100 overflow-hidden">
              {navGroups.map((group) => (
                <div key={group.title} className="p-2 space-y-0.5">
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.title}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                          isActive
                            ? 'bg-[#EFF6FF] text-[#2563EB] font-bold'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon
                            className={`w-4 h-4 flex-shrink-0 ${
                              isActive ? 'text-[#2563EB]' : 'text-slate-400'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badgeCount && item.badgeCount > 0 ? (
                          <span className="ml-2 px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-bold">
                            {item.badgeCount}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              ))}

              {/* Sign Out Action */}
              <div className="p-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Trust Assurance Badge */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>32-Point Assured Quality</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {supportConfig
                  ? `${Math.max(1, Math.round(supportConfig.standardWarrantyDays / 30))}-month standard hardware warranty, verified battery health, and dedicated support.`
                  : 'Hardware warranty, verified battery health, and dedicated support.'}
              </p>
            </div>
          </aside>

          {/* ── Main Working Canvas ── */}
          <main className="lg:col-span-3 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
    </CustomerLayout>
  );
}
