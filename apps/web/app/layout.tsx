import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'LaptopMitra | Certified Pre-Owned & Refurbished Laptops',
  description: 'India\'s #1 marketplace for certified refurbished laptops. 32-point inspection, 1-year warranty, free express delivery, and flat ₹500 discounts with Mitra codes.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F5F7FA] text-[#0F172A]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
