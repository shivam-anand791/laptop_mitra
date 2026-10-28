'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { AdminGuard } from '../../components/admin/AdminGuard';
import { useAdminStats, useAdminInquiries } from '../../lib/admin-queries';
import { api } from '../../lib/api';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  badgeKey?: 'pendingOrders' | 'pendingInquiries' | 'pendingWithdrawals';
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        name: 'Dashboard',
        href: '/admin',
        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      },
      {
        name: 'Analytics',
        href: '/admin/analytics',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      },
    ],
  },
  {
    label: 'Commerce',
    items: [
      {
        name: 'Orders',
        href: '/admin/orders',
        icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
        badgeKey: 'pendingOrders',
      },
      {
        name: 'Products',
        href: '/admin/products',
        icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      },
    ],
  },
  {
    label: 'Growth',
    items: [
      {
        name: 'Inquiries',
        href: '/admin/inquiries',
        icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
        badgeKey: 'pendingInquiries',
      },
      {
        name: 'Affiliates',
        href: '/admin/affiliates',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
        badgeKey: 'pendingWithdrawals',
      },
    ],
  },
  {
    label: 'Support',
    items: [
      {
        name: 'Tickets',
        href: '/admin/support',
        icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z',
      },
      {
        name: 'Returns',
        href: '/admin/returns',
        icon: 'M16 15v-1a4 4 0 00-4-4H4m0 0l3-3m-3 3l3 3m5 4v1a4 4 0 004 4h8m0 0l-3-3m3 3l-3 3',
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        name: 'Users',
        href: '/admin/users',
        icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      },
      {
        name: 'Settings',
        href: '/admin/settings',
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      },
    ],
  },
];

function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [{ label: 'Admin', href: '/admin' }];

  if (pathname === '/admin') {
    crumbs.push({ label: 'Dashboard' });
  } else if (pathname.startsWith('/admin/orders')) {
    crumbs.push({ label: 'Commerce' });
    crumbs.push({ label: 'Orders', href: '/admin/orders' });
    if (pathname !== '/admin/orders') {
      crumbs.push({ label: 'Detail' });
    }
  } else if (pathname.startsWith('/admin/products')) {
    crumbs.push({ label: 'Commerce' });
    crumbs.push({ label: 'Products', href: '/admin/products' });
  } else if (pathname.startsWith('/admin/inquiries')) {
    crumbs.push({ label: 'Growth' });
    crumbs.push({ label: 'Inquiries', href: '/admin/inquiries' });
  } else if (pathname.startsWith('/admin/affiliates')) {
    crumbs.push({ label: 'Growth' });
    crumbs.push({ label: 'Affiliates', href: '/admin/affiliates' });
    if (pathname !== '/admin/affiliates') {
      crumbs.push({ label: 'Partner Detail' });
    }
  } else if (pathname.startsWith('/admin/support')) {
    crumbs.push({ label: 'Support' });
    crumbs.push({ label: 'Tickets', href: '/admin/support' });
  } else if (pathname.startsWith('/admin/returns')) {
    crumbs.push({ label: 'Support' });
    crumbs.push({ label: 'Returns', href: '/admin/returns' });
  } else if (pathname.startsWith('/admin/analytics')) {
    crumbs.push({ label: 'Overview' });
    crumbs.push({ label: 'Analytics', href: '/admin/analytics' });
  } else if (pathname.startsWith('/admin/users')) {
    crumbs.push({ label: 'System' });
    crumbs.push({ label: 'Users', href: '/admin/users' });
  } else if (pathname.startsWith('/admin/settings')) {
    crumbs.push({ label: 'System' });
    crumbs.push({ label: 'Settings', href: '/admin/settings' });
  }

  return crumbs;
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isSupportUser = user?.role === 'SUPPORT';
  const displayedNavGroups = isSupportUser
    ? navGroups.filter((g) => g.label === 'Support')
    : navGroups;

  // Real backend counts for work queues
  const { data: stats } = useAdminStats({ refetchInterval: 30000 });
  const { data: inquiriesData } = useAdminInquiries({ status: 'PENDING', pageSize: 1 });
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState<number>(0);

  useEffect(() => {
    // Fetch pending withdrawals count from affiliates API
    let isMounted = true;
    api
      .getAdminAffiliates({ pageSize: 100 })
      .then((res) => {
        if (!isMounted || !res?.items) return;
        const count = res.items.reduce(
          (acc: number, curr: any) => acc + (Number(curr.pendingWithdrawalsCount) || 0),
          0,
        );
        setPendingWithdrawalsCount(count);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const queueCounts: Record<string, number> = {
    pendingOrders: stats?.pendingOrders || 0,
    pendingInquiries: inquiriesData?.total || 0,
    pendingWithdrawals: pendingWithdrawalsCount,
  };

  // Close mobile drawer on route navigation
  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Click outside listener for user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  const avatarInitial = (user?.name || user?.email || 'A').charAt(0).toUpperCase();
  const displayName = user?.name || user?.email?.split('@')[0] || 'Administrator';
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <div
      className="admin-root light min-h-screen bg-slate-50 text-gray-900"
      data-theme="light"
      style={{ colorScheme: 'light' }}
    >
      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 lg:hidden transition-opacity duration-200 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`sidebar transition-all duration-300 z-50 bg-white border-r border-gray-200 ${
          collapsed ? 'sidebar-collapsed' : ''
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        aria-label="Admin Navigation Sidebar"
      >
        <div className="flex flex-col h-full bg-white">
          {/* Sidebar Header & Brand */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-white">
            <Link
              href="/admin"
              className="flex items-center py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
              title="LaptopMitra Admin Dashboard"
            >
              {collapsed ? (
                <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white font-black text-sm">
                  LM
                </div>
              ) : (
                <Image
                  src="/logo.png"
                  alt="LaptopMitra Admin"
                  width={140}
                  height={45}
                  priority
                  className="h-8 w-auto object-contain"
                />
              )}
            </Link>

            {/* Desktop & Tablet Collapse Toggle Button */}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'}
                />
              </svg>
            </button>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Items with Group Labels */}
          <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto bg-white" aria-label="Main navigation">
            {displayedNavGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                {!collapsed && (
                  <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    {group.label}
                  </div>
                )}
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/admin' && pathname.startsWith(item.href + '/'));
                  const badgeCount = item.badgeKey ? queueCounts[item.badgeKey] || 0 : 0;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center ${
                        collapsed ? 'justify-center px-2' : 'space-x-3 px-3'
                      } py-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 border-l-[3px] ${
                        isActive
                          ? 'bg-blue-50/80 text-blue-700 border-blue-600 font-semibold'
                          : 'border-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-medium'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                      title={
                        collapsed
                          ? badgeCount > 0
                            ? `${item.name} (${badgeCount} pending)`
                            : item.name
                          : undefined
                      }
                    >
                      <div className="relative flex items-center justify-center">
                        <svg
                          className={`w-5 h-5 flex-shrink-0 ${
                            isActive ? 'text-blue-600' : 'text-gray-500'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                        </svg>
                        {collapsed && badgeCount > 0 && (
                          <span
                            className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white"
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      {!collapsed && (
                        <>
                          <span className="text-sm flex-1">{item.name}</span>
                          {badgeCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 tabular-nums">
                              {badgeCount}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-gray-200 bg-white">
            {collapsed ? (
              <div className="text-center text-[10px] font-bold text-gray-400">v1.0</div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-0.5 text-center">
                <span className="text-xs font-semibold text-gray-800">LaptopMitra Admin</span>
                <span className="text-[11px] text-gray-500">Portal v1.0.0</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`main-content transition-all duration-300 flex flex-col min-w-0 ${
          collapsed ? 'main-content-expanded' : ''
        }`}
      >
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-3">
              {/* Mobile menu trigger */}
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                aria-label="Open sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Dynamic Breadcrumbs Navigation */}
              <nav aria-label="Breadcrumb" className="flex items-center text-xs text-gray-500 font-medium">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={crumb.label}>
                      {idx > 0 && <span className="mx-2 text-gray-300">/</span>}
                      {crumb.href && !isLast ? (
                        <Link href={crumb.href} className="hover:text-primary transition-colors">
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className={isLast ? 'text-gray-900 font-semibold' : ''}>
                          {crumb.label}
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>
            </div>

            {/* Header Right Actions & Profile */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* View Storefront Link */}
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                title="View customer storefront"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                <span className="hidden sm:inline">View store</span>
              </Link>

              {/* User Menu Dropdown (Sign out moved inside) */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2.5 p-1 rounded-md hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer transition-colors"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label="User account menu"
                >
                  <div
                    className="w-8 h-8 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    {avatarInitial}
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-semibold text-gray-900 truncate max-w-[130px]">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-gray-500 capitalize">
                      {user?.role?.toLowerCase() || 'admin'}
                    </span>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 animate-fade-in-up"
                    style={{ animationDuration: '100ms' }}
                    role="menu"
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-900 truncate">{displayName}</p>
                      <p className="text-[11px] text-gray-500 truncate">{user?.email || 'admin@laptopmitra.in'}</p>
                    </div>

                    <Link
                      href="/"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      role="menuitem"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span>Storefront</span>
                    </Link>

                    <Link
                      href="/admin/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      role="menuitem"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Settings</span>
                    </Link>

                    <div className="border-t border-gray-100 my-1" />

                    <button
                      type="button"
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await logout();
                        router.replace('/login?next=/admin');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                      role="menuitem"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}