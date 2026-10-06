import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

type EmptyVariant = 'cart' | 'wishlist' | 'orders' | 'no-results' | 'referral';

interface EmptyStateProps {
  variant: EmptyVariant;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

const configs: Record<EmptyVariant, {
  image?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  defaultActionLabel: string;
  defaultActionHref: string;
}> = {
  cart: {
    image: '/images/generated/empty-cart.webp',
    icon: (
      <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Your cart is empty',
    description: 'Looks like you haven\'t added any laptops yet. Browse our certified collection to find your perfect match.',
    defaultActionLabel: 'Explore Laptops',
    defaultActionHref: '/products',
  },
  wishlist: {
    image: '/images/generated/empty-wishlist.webp',
    icon: (
      <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: 'No saved laptops yet',
    description: 'Heart a laptop to save it here for later. You can compare and buy when you\'re ready.',
    defaultActionLabel: 'Browse Laptops',
    defaultActionHref: '/products',
  },
  orders: {
    icon: (
      <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: 'No orders placed yet',
    description: 'When you place your first order, it will show up here. Ready to start shopping?',
    defaultActionLabel: 'Start Shopping',
    defaultActionHref: '/products',
  },
  'no-results': {
    image: '/images/generated/empty-search.svg',
    icon: (
      <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: 'No laptops match your filters',
    description: 'Try adjusting your search terms, changing the condition grade, or clearing active filters to see all available inventory.',
    defaultActionLabel: 'Reset All Filters',
    defaultActionHref: '/products',
  },
  referral: {
    icon: (
      <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'No referrals yet',
    description: 'Share your unique referral code with friends. They get ₹500 off, you earn 10% commission on every purchase!',
    defaultActionLabel: 'Share Your Code',
    defaultActionHref: '/profile#referral',
  },
};

export default function EmptyState({
  variant,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  const config = configs[variant];
  const label = actionLabel || config.defaultActionLabel;
  const href = actionHref || config.defaultActionHref;

  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 sm:px-6 text-center rounded-2xl bg-white border border-[#E4E9F2] shadow-sm">
      {/* Image / Icon */}
      {config.image ? (
        <div className="relative w-44 h-44 mb-4">
          <Image
            src={config.image}
            alt={config.title}
            fill
            className="object-contain"
            sizes="176px"
          />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#1D6FF2] flex items-center justify-center mb-4">
          {config.icon}
        </div>
      )}

      {/* Title */}
      <h3 className="text-lg sm:text-xl font-black text-[#0B1F4B] tracking-tight mb-2">
        {config.title}
      </h3>

      {/* Description */}
      <p className="text-xs sm:text-sm text-slate-600 max-w-sm mb-6 leading-relaxed">
        {config.description}
      </p>

      {/* CTA */}
      {onAction ? (
        <button
          onClick={onAction}
          className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-[#1D6FF2] hover:bg-[#1558C0] text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
        >
          {label}
        </button>
      ) : (
        <Link
          href={href}
          className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-[#1D6FF2] hover:bg-[#1558C0] text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
        >
          {label}
        </Link>
      )}
    </div>
  );
}
