'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CustomerLayout from '../../components/CustomerLayout';

export default function ProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#referral') {
      router.replace('/account/referral');
    } else if (hash === '#orders') {
      router.replace('/account/orders');
    } else if (hash === '#details') {
      router.replace('/account/profile');
    } else {
      router.replace('/account/orders');
    }
  }, [router]);

  return (
    <CustomerLayout>
      <div className="bg-[#F8FAFC] min-h-[60vh] flex items-center justify-center py-20 text-center text-xs font-semibold text-slate-500">
        Loading your account...
      </div>
    </CustomerLayout>
  );
}
