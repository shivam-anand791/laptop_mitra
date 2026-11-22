import React from 'react';
import CustomerLayout from '../../components/CustomerLayout';
import HelpSubnav from '../../components/help/HelpSubnav';

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerLayout>
      <HelpSubnav />
      {children}
    </CustomerLayout>
  );
}
