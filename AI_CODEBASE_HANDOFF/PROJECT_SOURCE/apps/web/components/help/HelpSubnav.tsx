'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export function protectedSupportHref(path: string, authenticated: boolean) {
  return authenticated ? path : `/login?next=${encodeURIComponent(path)}`;
}

export default function HelpSubnav() {
  const { isAuthenticated, isGuest } = useAuth();
  const authenticated = isAuthenticated && !isGuest;
  const links = [
    { href: '/help', label: 'Help Home' },
    { href: '/help#topics', label: 'Browse topics' },
    { href: protectedSupportHref('/account/orders', authenticated), label: 'Track an order' },
    { href: protectedSupportHref('/account/tickets', authenticated), label: 'My tickets' },
    { href: protectedSupportHref('/account/returns', authenticated), label: 'Returns & replacements' },
    { href: '/help#contact', label: 'Contact us' },
  ];

  return (
    <nav
      aria-label="Help navigation"
      className="sticky top-16 z-40 border-b border-[#E2E8F0] bg-white"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 py-2.5 text-xs font-semibold sm:px-6 lg:px-8">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="shrink-0 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function HelpBreadcrumbs({
  category,
  article,
  current,
}: {
  category?: string;
  article?: string;
  current?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-4 text-xs sm:px-6 lg:px-8">
      <ol className="flex flex-wrap items-center gap-2 text-slate-500">
        <li><Link href="/" className="hover:text-[#2563EB]">Home</Link></li>
        <li aria-hidden="true">/</li>
        <li><Link href="/help" className="hover:text-[#2563EB]">Help</Link></li>
        {category && (
          <>
            <li aria-hidden="true">/</li>
            <li>{category}</li>
          </>
        )}
        {article && (
          <>
            <li aria-hidden="true">/</li>
            <li className="font-semibold text-slate-800" aria-current="page">{article}</li>
          </>
        )}
        {current && !article && (
          <>
            <li aria-hidden="true">/</li>
            <li className="font-semibold text-slate-800" aria-current="page">{current}</li>
          </>
        )}
      </ol>
    </nav>
  );
}
