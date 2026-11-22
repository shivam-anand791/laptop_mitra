'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Store, Heart, ShoppingCart, User } from 'lucide-react';
import { useCart } from '../lib/cart-context';
import { useWishlist } from '../lib/wishlist-context';
import { useAuth } from '../lib/auth-context';

export default function BottomNav() {
  const pathname = usePathname() || '/';
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user } = useAuth();

  // Hide bottom nav on full-screen checkout flow and PDP (which has dedicated sticky purchase action bar)
  const isCheckout = pathname === '/checkout';
  const isPDP = /^\/products\/[^/]+$/.test(pathname);
  if (isCheckout || isPDP) {
    return null;
  }

  const navItems = [
    {
      label: 'Home',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      label: 'Store',
      href: '/products',
      icon: Store,
      isActive: pathname.startsWith('/products'),
    },
    {
      label: 'Wishlist',
      href: '/wishlist',
      icon: Heart,
      isActive: pathname === '/wishlist',
      badge: wishlistCount > 0 ? wishlistCount : undefined,
    },
    {
      label: 'Cart',
      href: '/cart',
      icon: ShoppingCart,
      isActive: pathname === '/cart',
      badge: itemCount > 0 ? itemCount : undefined,
    },
    {
      label: 'Account',
      href: user && !user.isGuest ? '/account/orders' : '/login',
      icon: User,
      isActive: pathname.startsWith('/account') || pathname === '/login' || pathname === '/register',
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-t border-[#E6DFD5] shadow-[0_-4px_20px_rgba(11,31,75,0.06)]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around h-15 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 relative min-w-0 transition-all active:scale-90 ${
                item.isActive ? 'text-[#2563EB]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={item.isActive ? 2.5 : 1.8}
                  className={`transition-transform duration-150 ${item.isActive ? 'scale-110' : ''}`}
                />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-[#2563EB] text-white font-mono text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-xs ring-2 ring-[#FFFDF9]">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 leading-none tracking-tight truncate ${
                  item.isActive ? 'font-bold text-[#2563EB]' : 'font-medium text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
