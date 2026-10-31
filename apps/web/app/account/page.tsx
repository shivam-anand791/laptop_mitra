'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/account/orders');
  }, [router]);

  return (
    <div className="py-12 text-center text-xs font-semibold text-slate-400">
      Loading your orders...
    </div>
  );
}
