'use client';

import React from 'react';
import CustomerLayout from '@/components/CustomerLayout';
import { WishlistView } from '@/components/account';

export default function StandaloneWishlistPage() {
  return (
    <CustomerLayout>
      <div className="bg-[#F8FAFC] min-h-screen py-6 sm:py-8 lg:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <WishlistView embeddedInAccount={false} />
        </div>
      </div>
    </CustomerLayout>
  );
}
