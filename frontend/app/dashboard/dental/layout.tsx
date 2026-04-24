'use client';

import type React from 'react';
import { useState } from 'react';

import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { DENTAL_NAV_GROUPS } from '@/constants/dentalNavigation';

interface DentalLayoutProps {
  children: React.ReactNode;
}

export default function DentalLayout({ children }: DentalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName="Dental Team"
        userRole="dental"
        brandSubtitle="Dental Clinic"
        navGroups={DENTAL_NAV_GROUPS}
      />

      <div className="flex flex-col flex-1 min-w-0 bg-gray-50">
        <TopBar
          onMenuOpen={() => setSidebarOpen(true)}
          userName="Dental Team"
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
